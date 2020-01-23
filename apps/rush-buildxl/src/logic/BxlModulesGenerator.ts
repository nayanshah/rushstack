// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';

import { RushConfiguration, IStaticProject } from '@microsoft/rush-lib';

import { BxlModule } from './BxlModule';
import { BxlConfig } from './BxlConfig';

export class BxlModulesGenerator {
  private _rushConfiguration: RushConfiguration;
  private _buildXLRoot: string;
  private _projects: IStaticProject[];

  public constructor(rushConfiguration: RushConfiguration, buildXLRoot: string, projects: IStaticProject[]) {
    this._rushConfiguration = rushConfiguration;
    this._buildXLRoot = this._normalizePathSeparator(buildXLRoot);
    this._projects = projects;
  }

  public async run(): Promise<void> {
    const modulesRoot: string = this._normalizePathSeparator(
      path.resolve(this._rushConfiguration.commonTempFolder, 'bxl', 'modules')
    );
    const rushJsonFilePath: string = this._normalizePathSeparator(this._rushConfiguration.rushJsonFile);
    const repoRoot: string = this._normalizePathSeparator(path.dirname(rushJsonFilePath));
    const commonRushConfigFolder: string = this._normalizePathSeparator(this._rushConfiguration.commonRushConfigFolder);
    if (this._projects === undefined) {
      throw new Error('Null');
    }

    const modules: BxlModule[] =  this._projects.map((project) => {
      const name: string = this._packageNameToModuleName(project.rushProject.packageName);
      const moduleRoot: string = path.resolve(modulesRoot, name);
      const projDir: string = this._normalizePathSeparator(project.rushProject.projectFolder);
      const dependencies: string[] = project.dependencies.map((p) => this._normalizePathSeparator(p.projectFolder));
      return new BxlModule(rushJsonFilePath, {
        name: name,
        projectFolder: projDir,
        moduleFolder: moduleRoot,
        buildCommand: project.buildCommand,
        dependencies: dependencies
      });
    });

    const bxlConfig: BxlConfig =
        new BxlConfig(this._buildXLRoot, modulesRoot, modules, commonRushConfigFolder, repoRoot);

    // Write individual module dsc files
    const tasks: Promise<void>[] = modules.map(module => module.writeFile());
    await Promise.all(tasks);

    // Write config.dsc
    await bxlConfig.writeFile();
  }

  private _packageNameToModuleName(packageName: string): string {
    return packageName.replace('/', '_');
  }

  private _normalizePathSeparator(str: string): string {
    return str.replace(/\\/g, '/');
  }
}