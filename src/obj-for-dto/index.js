"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objForDto = void 0;
const core_1 = require("@angular-devkit/core");
const strings_1 = require("@angular-devkit/core/src/utils/strings");
const schematics_1 = require("@angular-devkit/schematics");
const fs = require("fs");
const process = require("process");
const path = require("path");
const regex = /(?<variable>[^:]+):(?<type>.*)/;
const constructorDefinitionParameter = [];
const checks = [];
const consts = [];
const properties = [];
const expects = [];
const comma = [];
const extras = [];
const constructorComma = [];
const testGenerationMethods = new Set();
let needsHasValue = false;
const findFile = (name) => {
    let search = process.cwd();
    let count = 0;
    while (name) {
        count++;
        const index = search.lastIndexOf(path.sep);
        if (index === -1)
            throw new schematics_1.SchematicsException(`Unable to find ${name}`);
        search = search.slice(0, index);
        if (fs.existsSync(`${search}${path.sep}${name}`))
            return (0, core_1.normalize)(Array.from(Array(count), () => '..').join(path.sep) + path.sep + name.slice(0, -3));
    }
    throw new schematics_1.SchematicsException(`Unable to find ${name}`);
};
const findHasValue = () => findFile('has-value.ts');
const findSetupJest = () => findFile('setup-jest-esm.ts');
const generateProperty = (options) => {
    const propertyType = options.isCustomObject ? `I${options.baseType}` : options.baseType;
    let property = `    ${options.name}: ${propertyType}`;
    if (options.isArray)
        property += '[]';
    else if (options.isOptional)
        property += ' | null';
    if (options.baseType === 'Date')
        property += ' | string';
    properties.push(property);
};
const generateConstructorParameter = (options) => {
    if (options.isCustomObject || options.baseType === 'Date')
        return options.name;
    let constructorParameter = `json.${options.name}`;
    if (options.isOptional) {
        if (options.baseType === 'string' && !options.isArray)
            // We want an empty string to become null
            constructorParameter = `${constructorParameter} || null`;
        else
            constructorParameter += ' ?? ' + (options.isArray ? '[]' : 'null');
    }
    return constructorParameter;
};
const generateCustomDecoder = (options) => {
    const name = options.name;
    let generator = [];
    if (options.baseType === 'Date') {
        if (options.isArray) {
            generator.push(`const ${name} = json.${name}?.map(x => new Date(x)).filter(x => !isNaN(x.getTime()))`);
            generator.push(`if (!(${name} && json.${name} && ${name}.length === json.${name}.length))`);
        }
        else if (options.isOptional) {
            generator.push(`const ${name} = json.${name} ? new Date(json.${name}) : null`);
            generator.push(`if (${name} && isNaN(${name}.getTime()))`);
        }
        else {
            generator.push(`const ${name} = new Date(json.${name})`);
            generator.push(`if (isNaN(${name}.getTime()))`);
        }
        generator.push(`    return undefined`);
        generator.push('');
    }
    else if (options.isCustomObject) {
        let str = `const ${name} = `;
        if (options.isArray) {
            needsHasValue = true;
            str += `json.${name}?.map(${options.baseType}.fromJson).filter(hasValue)`;
        }
        else
            str += `${options.baseType}.fromJson(json.${name})`;
        if (options.isOptional) {
            let coalesce = options.isArray ? '[]' : 'null';
            generator.push(`${str} ?? ${coalesce}`);
        }
        else {
            generator.push(str);
            generator.push(`if (!${name})`);
            generator.push('    return undefined');
        }
        generator.push('');
    }
    else
        return [];
    return generator;
};
const generateChecks = (options) => {
    if (options.isCustomObject || options.isOptional)
        return;
    else if (options.baseType === 'boolean') {
        needsHasValue = true;
        checks.push(`hasValue(json.${options.name})`);
    }
    else
        checks.push(`json.${options.name}`);
};
const generatorConstructorDefinitionParameter = (options) => {
    let constructor = `        public readonly ${options.name}: ${options.baseType}`;
    if (options.isArray)
        constructor += '[]';
    else if (options.isOptional)
        constructor += ' | null';
    return constructor;
};
function objForDto(options) {
    return (_tree, _context) => {
        const jestImportPath = findSetupJest();
        if (!options.name)
            throw new schematics_1.SchematicsException('Must provide class name');
        if (!options.propertyNames)
            throw new schematics_1.SchematicsException('Must provide property names');
        const className = core_1.strings.classify(options.name);
        const entity = core_1.strings.camelize(className);
        let needsUuid = false;
        const mapping = {
            's': { type: 'string', testGenerationMethod: 'v4', fromJson: false },
            'n': { type: 'number', testGenerationMethod: 'getRandomInt', fromJson: false },
            'b': { type: 'boolean', testGenerationMethod: 'getRandomBoolean', fromJson: false },
            'd': { type: 'Date', testGenerationMethod: 'getRandomDate', fromJson: false },
            'e': { type: 'Employee', testGenerationMethod: '', fromJson: true }
        };
        const customObjects = {};
        options
            .propertyNames
            .trim()
            .split(/[\s*,]/)
            .filter(x => x)
            .forEach(x => {
            let type = '';
            let variable;
            const match = x.match(regex);
            if (match?.groups) {
                variable = match.groups.variable;
                type = match.groups.type;
            }
            else {
                variable = x;
                type = 's';
            }
            let isOptional = false;
            if (type?.endsWith('?')) {
                type = type.slice(0, -1);
                isOptional = true;
            }
            let isArray = false;
            if (type?.endsWith('[]')) {
                type = type.slice(0, -2);
                isArray = true;
            }
            const map = mapping[type] ?? { type, method: '', fromJson: true };
            if (map.fromJson) {
                map.testGenerationMethod = `getTest${map.type}`;
                if (!customObjects[map.type]) {
                    try {
                        customObjects[map.type] = findFile((0, strings_1.dasherize)(map.type) + '.ts');
                    }
                    catch {
                    }
                }
            }
            else if (type !== 's')
                testGenerationMethods.add(map.testGenerationMethod);
            type = map.type;
            const input = {
                baseType: type,
                isArray,
                isCustomObject: map.fromJson,
                isOptional,
                name: variable
            };
            generateChecks(input);
            constructorComma.push(generateConstructorParameter(input));
            const decoder = generateCustomDecoder(input);
            if (decoder)
                extras.push(...decoder);
            generateProperty(input);
            constructorDefinitionParameter.push(generatorConstructorDefinitionParameter(input));
            if (isArray)
                consts.push(`        const ${variable} = [${map.testGenerationMethod}()]`);
            else
                consts.push(`        const ${variable} = ${map.testGenerationMethod}()`);
            comma.push(variable);
            if (input.isCustomObject || type === 'Date')
                expects.push(`        expect(${entity}?.${variable}).toStrictEqual(${variable})`);
            else if (isArray)
                expects.push(`        expect(${entity}?.${variable}).toEqual(${variable})`);
            else
                expects.push(`        expect(${entity}?.${variable}).toBe(${variable})`);
            if (type === 'string')
                needsUuid = true;
        });
        let sourceObjectImports = Object.entries(customObjects)
            .map(([type, file]) => `import {${type}, I${type}} from '${file}'`)
            .join('\n');
        let testObjectImports = Object.entries(customObjects)
            .map(([type, file]) => `import {${type}} from '${file}'`);
        const helpers = [...testGenerationMethods]
            .sort()
            .join(', ');
        if (helpers)
            testObjectImports.push(`import {${helpers}} from '${jestImportPath}'`);
        if (needsUuid)
            testObjectImports.push(`import {v4} from 'uuid'`);
        if (needsHasValue)
            sourceObjectImports += `\nimport {hasValue} from '${findHasValue()}'`;
        if (sourceObjectImports)
            sourceObjectImports += '\n';
        let checkString = '';
        if (checks.length > 0)
            checkString = `!(json && ${checks.join(' && ')})`;
        else
            checkString = '!json';
        const extraStringNewline = '\n        ';
        const extraString = extras.length ? extras.join(extraStringNewline) + extraStringNewline : '';
        const source = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            (0, schematics_1.applyTemplates)({
                classify: core_1.strings.classify,
                dasherize: core_1.strings.dasherize,
                name: options.name,
                entity,
                sourceObjectImports,
                testObjectImports: testObjectImports.join('\n'),
                className,
                comma: comma.join(', '),
                constructorComma: constructorComma.join(', '),
                constructor: constructorDefinitionParameter.join(',\n'),
                properties: properties.join('\n'),
                checks: checkString,
                consts: consts.join('\n'),
                expects: expects.join('\n'),
                extras: extraString,
                dtocmd: `ng generate @gargoylesoft/obj-for-dto:obj-for-dto ${className} ${options.propertyNames.trim()}`
            }),
            (0, schematics_1.move)(`/${options.path}/${core_1.strings.dasherize(options.name)}`)
        ]);
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(source, schematics_1.MergeStrategy.Overwrite)
        ]);
    };
}
exports.objForDto = objForDto;
//# sourceMappingURL=index.js.map