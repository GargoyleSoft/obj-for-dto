import {normalize} from '@angular-devkit/core'
import {Rule, SchematicContext, Tree} from '@angular-devkit/schematics'
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks'

export function ngAdd(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        context.logger.info('Installing obj-for-dto...')

        const hasValue = normalize('/src/app/has-value.ts')
        if (!tree.exists(hasValue)) {
            context.logger.info(` - Creating ${hasValue}`)
            tree.create(hasValue, 'export const hasValue = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined\n')
        }

        context.addTask(new NodePackageInstallTask())

        return tree
    }
}
