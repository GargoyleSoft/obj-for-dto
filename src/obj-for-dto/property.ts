const spaces = '   '

export class Property {
    readonly customType: boolean
    readonly #jsonName: string

    constructor(
        public readonly name: string,
        public readonly type: string,
        public readonly isOptional: boolean,
        public readonly isArray: boolean
    ) {
        this.customType = !(type === 'Date' || type === 'number' || type === 'string' || type === 'boolean')
        this.#jsonName = `json.${name}`
    }

    get needsHasValue() {
        return (this.customType && this.isArray) || this.type === 'number' || this.type === 'boolean'
    }

    interfaceLine() {
        let str = `${spaces}${this.name}: `

        if (this.customType)
            str += 'I'

        str += this.type

        if (this.isArray)
            str += '[]'
        else if (this.isOptional)
            str += ' | null'

        return str
    }

    dtoLine() {
        if (!this.customType)
            return null

        let str = `${spaces}${this.name}?: ${this.type}DTO`

        if (this.isArray)
            str += '[]'

        str += ' | null'

        return str
    }

    constructorLine() {
        let str = `${spaces}${spaces}public readonly ${this.name}: ${this.type}`

        if (this.isArray)
            str += '[]'
        else if (this.isOptional)
            str += ' | null'

        return str
    }

    constructorCall() {
        if (this.isOptional) {
            if (this.type === 'number' || this.type === 'boolean')
                return `hasValue(${this.#jsonName}) ? ${this.#jsonName} : null`
            else if (this.type === 'string')
                return `${this.#jsonName} || null`
            else
                return this.name
        } else if (this.customType)
            return this.name
        else
            return this.#jsonName
    }

    jsonLine() {
        if (this.type === 'Date')
            return this.dateJsonLine()
        else if (this.customType)
            return this.customJsonLine()
        else if (this.isArray)
            return this.arrayJsonLine()
        else
            return null
    }

    jsonCheck() {
        if (this.isOptional)
            return null

        if (this.isArray)
            return `Array.isArray(${this.#jsonName})`
        else if (this.customType)
            return null
        else if (this.type === 'boolean' || this.type === 'number')
            return `hasValue(${this.#jsonName})`
        else
            return this.#jsonName
    }

    private customJsonLine() {
        const lines: string[] = []

        let str = `const ${this.name} = `

        if (this.isArray)
            str += `${this.#jsonName}.map(${this.type}.fromJson).filter(hasValue)`
        else
            str += `${this.type}.fromJson(${this.#jsonName})`

        if (this.isOptional) {
            let coalesce = this.isArray ? '[]' : 'null'
            lines.push(`${str} ?? ${coalesce}`)
        } else {
            lines.push(str)
            lines.push(`if (!${this.name})`)
            lines.push(`${spaces}return undefined`)
        }

        return lines.map(x => `${spaces}${spaces}${x}`).join('\n')
    }

    private arrayJsonLine() {
        const lines: string[] = [`let ${this.name}: ${this.type}[] = []`]

        let prefix = ''

        if (this.isOptional) {
            lines.push(`if (${this.#jsonName}) {`)
            prefix = spaces
        }

        lines.push(`${prefix}if (!Array.isArray(${this.#jsonName}))`)
        lines.push(`${prefix}${spaces}return undefined`)
        lines.push('')

        const filter = this.type === 'number' ? 'Number.isFinite' : 'hasValue'
        lines.push(`${prefix}${this.name} = ${this.#jsonName}.filter(${filter})`)
        lines.push(`${prefix}if (${this.name}.length !== ${this.#jsonName}.length)`)
        lines.push(`${prefix}${spaces}return undefined`)

        if (this.isOptional)
            lines.push('}')

        return lines.map(x => `${spaces}${spaces}${x}`).join('\n')
    }

    private dateJsonLine() {
        const lines: string[] = []

        if (this.isArray) {
            lines.push(`let ${this.name}: ${this.type}[] = []`)

            let prefix = ''

            if (this.isOptional) {
                lines.push(`if (${this.#jsonName}) {`)
                prefix = spaces
            }

            lines.push(`${prefix}if (!Array.isArray(${this.#jsonName}))`)
            lines.push(`${prefix}${spaces}return undefined`)
            lines.push('')

            lines.push(`${prefix}${this.name} = ${this.#jsonName}?.map(x => new Date(x)).filter(x => isFinite(x.getTime()))`)
            lines.push(`${prefix}if (${this.name}.length !== ${this.#jsonName}.length)`)
            lines.push(`${prefix}${spaces}return undefined`)

            if (this.isOptional)
                lines.push('}')
        } else if (this.isOptional) {
            lines.push(`const ${this.name} = ${this.#jsonName} ? new Date(${this.#jsonName}) : null`)
            lines.push(`if (${this.name} && isFinite(${this.name}.getTime()))`)
            lines.push(`${spaces}return undefined`)
        } else {
            lines.push(`const ${this.name} = new Date(${this.#jsonName})`)
            lines.push(`if (isFinite(${this.name}.getTime()))`)
            lines.push(`${spaces}return undefined`)
        }

        return lines.map(x => `${spaces}${spaces}${x}`).join('\n')
    }
}
