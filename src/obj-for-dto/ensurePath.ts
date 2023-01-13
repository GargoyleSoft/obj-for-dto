import {Tree} from '@angular-devkit/schematics'
import {parseName} from '@schematics/angular/utility/parse-name'
import {buildDefaultPath, getWorkspace} from '@schematics/angular/utility/workspace'
import {Options} from './options'

export async function ensurePath(tree: Tree, options: Options): Promise<void> {
    const workspace = await getWorkspace(tree)
    const projectValue = workspace.projects.keys().next().value as string
    const project = workspace.projects.get(projectValue)

    if (options.path === undefined && project)
        options.path = buildDefaultPath(project)

    const parsedPath = parseName(options.path as string, options.name)
    options.name = parsedPath.name
    options.path = parsedPath.path
}
