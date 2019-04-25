Wordup CLI 
==========

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/wordup-cli.svg)](https://npmjs.org/package/wordup-cli)
[![Downloads/week](https://img.shields.io/npm/dw/wordup-cli.svg)](https://npmjs.org/package/wordup-cli)


Wordup CLI is an open-source development toolkit for setting up and managing your local WordPress Theme/Plugin development, so that you can totally focus on coding.

It is based on docker-compose and uses a docker containerized LAMP-stack with all WordPress Plugins/Themes you need for your current project.

<!-- toc -->
* [Features](#features)
* [Examples](#examples)
* [Installation / Requirements](#installation--requirements)
* [Folder structure](#folder-structure)
* [Usage](#usage)
* [Commands](#commands)
* [Learn more](#learn-more)
* [Contributing](#contributing)
* [License](#license)
<!-- tocstop -->


# Features

What you can do with wordup-cli:

* 💡**Rapidly test new ideas** - And develop your new WordPress theme/plugin projects in wordup. 
* ⏱**Speed up your development** - Install a new project with a blank WordPress installation in a matter of minutes
* 🛠️**Boilerplate** - Scaffold your theme/plugin with the official source code from WordPress (e.g. [underscore](https://github.com/automattic/_s))
* ⚙️**Automatic installation of dependencies** - Automatically download and activate public WordPress Plugins/Themes or even Github hosted projects (like e.g. [wp-graphql](https://github.com/wp-graphql/wp-graphql))
* 🚀**Easy portability** - Export your theme/project or your whole WordPress installation. So that you can install it on a remote server.
* 📦**Backup your installation** - And (re)install a project from an exported wordup project.
* 🤩**Hassle-free remote WordPress connection** - Install your project, based on an existing WordPress hosted website (with the wordup-connect plugin). Use this feature for example to test major WordPress updates with ease locally.
* 👾**Share your stack** - wordup is the easiest way to share your project with the world or just your team members. Just type:  `git clone`, and then `wordup install`

# Examples

Check out this [video](https://wordup.dev/#video) on our website to see how fast you can setup a new WordPress dev environment.

# Installation / Requirements 

Make sure you have node >= 8 and [docker-compose](https://www.docker.com/get-started) installed on your machine.  

```sh-session
$ npm install -g wordup-cli
```

# Folder structure 

```
A default wordup project structure looks like this

├── .gitignore
├── README.md
├── package.json
├── dist
|    └── (Your exported plugin/theme files)
└── src
     ├── .distignore
     └── (Your plugin/theme src files)
```

# Usage
<!-- usage -->
```sh-session
$ npm install -g wordup-cli
$ wordup COMMAND
running command...
$ wordup (-v|--version|version)
wordup-cli/0.1.1 darwin-x64 node-v10.15.0
$ wordup --help [COMMAND]
USAGE
  $ wordup COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`wordup export TYPE`](#wordup-export-type)
* [`wordup help [COMMAND]`](#wordup-help-command)
* [`wordup init`](#wordup-init)
* [`wordup install`](#wordup-install)
* [`wordup list`](#wordup-list)
* [`wordup start`](#wordup-start)
* [`wordup stop`](#wordup-stop)
* [`wordup wpcli COMMAND`](#wordup-wpcli-command)

## `wordup export TYPE`

Export your plugin/theme or the whole WordPress installation

```
USAGE
  $ wordup export TYPE

ARGUMENTS
  TYPE  (src|installation|sql) [default: src] What type do you want to export

OPTIONS
  --logs  Shows all stdout logs of this process

DESCRIPTION
  ...
  The exported zip-file of a plugin/theme are ready for distribution.
  An exported installation file can be used for setting up a remote WordPress installation or
  for backing up your current development stack.
```

_See code: [src/commands/export.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/export.js)_

## `wordup help [COMMAND]`

display help for wordup

```
USAGE
  $ wordup help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_

## `wordup init`

Create a new wordup project in the current directoy

```
USAGE
  $ wordup init

DESCRIPTION
  ...
  After you initialized a new project, you are able to install your development stack.
```

_See code: [src/commands/init.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/init.js)_

## `wordup install`

Install and start the WordPress development server

```
USAGE
  $ wordup install

OPTIONS
  -f, --force                Force the installation of the project
  -p, --port=port            Install on a different port. Default: 8000
  --archive=archive          Install from an wordup archive.
  --connect=connect          Install from an WordPress running website.
  --logs                     Shows all stdout logs of this process
  --private-key=private-key  Private key for the wordup-connect plugin
  --prompt                   If you want to do the setup again

DESCRIPTION
  ...
  If there is no installation config in your package.json, a step-by-step setup will be shown.
  Info: Flags in this command overrule the config of your package.json.
```

_See code: [src/commands/install.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/install.js)_

## `wordup list`

List all executable wordup projects

```
USAGE
  $ wordup list

OPTIONS
  --clear  Clears the project list from non-existing projects

DESCRIPTION
  ...
  If you see deleted projects in this list, run with --clear flag.

ALIASES
  $ wordup ls
```

_See code: [src/commands/list.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/list.js)_

## `wordup start`

Start the WordPress development server

```
USAGE
  $ wordup start

OPTIONS
  -f, --force      Force the start of the project
  -p, --port=port  Overwrite installed port
  --logs           Shows all stdout logs of this process

DESCRIPTION
  ...
  You can run only this command if your development stack is installed.

ALIASES
  $ wordup run
```

_See code: [src/commands/start.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/start.js)_

## `wordup stop`

Stop the development server

```
USAGE
  $ wordup stop

OPTIONS
  -d, --delete           Deletes all attached volumes/data (WARNING: Your content in your WordPress installation will be
                         deleted)

  -p, --project=project  A project slug name

  --logs                 Shows all stdout logs of this process

DESCRIPTION
  ...
  Optionally you can use -d to delete the whole installation, this includes all files in your WordPress installation.
```

_See code: [src/commands/stop.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/stop.js)_

## `wordup wpcli COMMAND`

Use an official WordPress CLI command on the current running project

```
USAGE
  $ wordup wpcli COMMAND

ARGUMENTS
  COMMAND  the wp cli command

OPTIONS
  --logs  Shows all stdout logs of this process

DESCRIPTION
  ...
  As an example: wordup wpcli post list
```

_See code: [src/commands/wpcli.js](https://github.com/wordup-dev/wordup-cli/blob/v0.1.1/src/commands/wpcli.js)_
<!-- commandsstop -->

# Learn more

To learn more about wordup in general, visit: https://wordup.dev

# Contributing

wordup-cli is an open-source project. If you are interested in contributing to wordup-cli, 
fell free to join us.

# License

See the [LICENSE](LICENSE) file for details
