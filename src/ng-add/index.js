"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngAdd = void 0;
const core_1 = require("@angular-devkit/core");
const tasks_1 = require("@angular-devkit/schematics/tasks");
function ngAdd() {
    return (tree, context) => {
        context.logger.info('Installing obj-for-dto...');
        const hasValue = (0, core_1.normalize)('/src/app/has-value.ts');
        if (!tree.exists(hasValue)) {
            context.logger.info(` - Creating ${hasValue}`);
            tree.create(hasValue, 'export const hasValue = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined\n');
        }
        context.addTask(new tasks_1.NodePackageInstallTask());
        return tree;
    };
}
exports.ngAdd = ngAdd;
//# sourceMappingURL=index.js.map