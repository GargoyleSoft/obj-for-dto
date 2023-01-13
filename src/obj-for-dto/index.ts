import {normalize, strings} from '@angular-devkit/core'
import {dasherize} from '@angular-devkit/core/src/utils/strings'
import {
    apply,
    applyTemplates,
    MergeStrategy,
    mergeWith,
    move,
    Rule,
    SchematicContext,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics'
import {getWorkspace} from '@schematics/angular/utility/workspace'
import * as fs from 'fs'
import * as process from 'process'
import {ensurePath} from './ensurePath'
import {Options} from './options'
import {Property} from './property'
import path = require('path')

const regex = /(?<variable>[^:]+):(?<type>.*)/

const findFile = (name: string): string => {
    let search = process.cwd()
    let count = 0

    while (name) {
        count++

        const index = search.lastIndexOf(path.sep)
        if (index === -1)
            throw new SchematicsException(`Unable to find ${name}`)

        search = search.slice(0, index)
        if (fs.existsSync(`${search}${path.sep}${name}`))
            return normalize(Array.from(Array(count), () => '..').join(path.sep) + path.sep + name.slice(0, -3))
    }

    throw new SchematicsException(`Unable to find ${name}`)
}

const findHasValue = (): string => findFile('has-value.ts')

const hasValue = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined

export function objForDto(options: Options): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        if (!options.name)
            throw new SchematicsException('Must provide class name')

        if (!options.propertyNames)
            throw new SchematicsException('Must provide property names')

        const workspace = await getWorkspace(tree)
        const projectValue = workspace.projects.keys().next().value as string

        const project = workspace.projects.get(projectValue)
        if (project) {
            _context.logger.info(project.root)
            _context.logger.info(project.prefix as string)
            _context.logger.info(project.sourceRoot as string)
        }

        await ensurePath(tree, options)
        _context.logger.info(options.path as string)

        const className = strings.classify(options.name)

        const mapping: { [key: string]: string } = {
            's': 'string',
            'n': 'number',
            'b': 'boolean',
            'd': 'Date',
            'e': 'Employee'
        }

        const dtoLineMap: { [key: string]: string } = {}

        const properties = options
            .propertyNames
            .trim()
            .split(/[\s*,]/)
            .filter(hasValue)
            .map(x => {
                let type = ''
                let variable: string

                const match = x.match(regex)
                if (match?.groups) {
                    variable = match.groups.variable
                    type = match.groups.type
                } else {
                    variable = x
                    type = 's'
                }

                let isOptional = false

                if (type?.endsWith('?')) {
                    type = type.slice(0, -1)
                    isOptional = true
                }

                let isArray = false
                if (type?.endsWith('[]')) {
                    type = type.slice(0, -2)
                    isArray = true
                }

                const property = new Property(variable, mapping[type] ?? type, isOptional, isArray)
                const dtoLine = property.dtoLine()
                if (dtoLine)
                    dtoLineMap[property.name] = dtoLine

                return property
            })
            .sort((a, b) => a.name.localeCompare(b.name))

        const interfaceLines: string[] = []
        const constructorParameters: string[] = []
        const checks: string[] = []
        const constructorComma: string[] = []
        const extras: string[] = []
        const imports: string[] = []
        let needsHasValue = false

        properties.forEach(x => {
            interfaceLines.push(x.interfaceLine())
            constructorParameters.push(x.constructorLine())

            const decode = x.jsonLine()
            if (decode) {
                constructorComma.push(x.name)
                extras.push(decode)
                extras.push('')

                if (x.customType) {
                    const types = [x.type, `I${x.type}`, `${x.type}DTO`].sort().join(', ')
                    imports.push(`import {${types}} from './${dasherize(x.type)}'`)
                }
            } else
                constructorComma.push(x.constructorCall())

            const check = x.jsonCheck()
            if (check)
                checks.push(check)

            needsHasValue = needsHasValue || x.needsHasValue
        })

        const dtoKeys = Object.keys(dtoLineMap).sort()

        let dtoLine = `export type ${className}DTO = `
        let partial = `Partial<I${className}>`
        if (!dtoKeys.length)
            dtoLine += partial
        else {
            dtoLine += `Omit<${partial}, '${dtoKeys.join('\' | \'')}'> & {\n`
            dtoLine += dtoKeys.map(x => dtoLineMap[x]).join('\n')
            dtoLine += '\n}'
        }

        if (needsHasValue)
            imports.push(`import {hasValue} from '${findHasValue()}'`)

        if (extras.length > 0)
            extras.push('')

        const source = apply(url('./files'), [
            applyTemplates({
                ...options,
                ...strings,
                dtoLine,
                className,
                interfaceLines: interfaceLines.join('\n'),
                constructorParameters: constructorParameters.join(',\n'),
                constructorComma: constructorComma.join(', '),
                imports: imports.filter((n, i) => imports.indexOf(n) === i).join('\n'),
                checks: checks.length > 0 ? `(json && ${checks.join(' && ')})` : 'json',
                extras: extras.join('\n')
            }),
            move(options.name as string)
        ])

        return mergeWith(source, MergeStrategy.Overwrite)
    }
}
