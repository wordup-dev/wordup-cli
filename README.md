Wordup CLI
==========

![Wordup](https://wordup.dev/assets/img/logo_social.png)

[![Version](https://img.shields.io/npm/v/wordup-cli.svg)](https://npmjs.org/package/wordup-cli)
[![Downloads/week](https://img.shields.io/npm/dw/wordup-cli.svg)](https://npmjs.org/package/wordup-cli)
[![Wordup docs](https://img.shields.io/badge/wordup-docs-brightgreen.svg)](https://docs.wordup.dev)
[![Twitter Follow](https://img.shields.io/twitter/follow/wordup_dev.svg?label=%40wordup_dev&style=social)](https://twitter.com/wordup_dev)

> ⚠️**CAUTION**: The 1.0.0 major release is not backwards compatible

Wordup CLI is an open-source development toolkit for setting up and managing your local WordPress Theme/Plugin development, so that you can totally focus on coding.

It is based on docker-compose and uses a docker containerized LAMP-stack with all WordPress Plugins/Themes you need for your current project.

<!-- toc -->
* [Features](#features)
* [Installation / Requirements](#installation--requirements)
* [Documentation](#documentation)
* [Usage](#usage)
* [Commands](#commands)
* [Wordup for Visual Studio Code](#wordup-for-visual-studio-code)
* [Learn more](#learn-more)
* [License / Contributing](#license--contributing)
<!-- tocstop -->

# Features

What you can do with wordup-cli:

* 💡**Rapidly test new ideas** - And develop your new WordPress theme/plugin projects in wordup. 
* ⏱**Speed up your development** - Install a new project with a blank WordPress installation in a matter of minutes
* 🛠️**Boilerplate** - Scaffold your theme/plugin with the official source code from WordPress (e.g. [underscore](https://github.com/automattic/_s)). You can also add code snippets like *Gutenberg* blocks to your source code.
* ⚙️**Automatic installation of dependencies** - Automatically download and activate public WordPress Plugins/Themes or even Github hosted projects (like e.g. [wp-graphql](https://github.com/wp-graphql/wp-graphql))
* 🚀**Easy portability** - Export your theme/project or your whole WordPress installation. So that you can install it on a remote server.
* 📦**Backup your installation** - And (re)install a project from an exported wordup project.
* 👾**Share your stack** - wordup is the easiest way to share your WordPress project with the world or just your team members. Just type:  `git clone`, and then `wordup install`
* ✉️**Catch emails** - Catch all emails from WordPress and view the outgoing emails in a web UI

# Installation / Requirements 

Make sure you have node >= 8.3 (npm >= 5.2) and [docker-compose](https://www.docker.com/get-started) installed on your machine. 

We recommend to install wordup-cli **globally**: 

```sh
$ npm install -g wordup-cli
```

After installing wordup-cli, you can create your first project with `wordup init`

# Documentation

For detailed information visit [docs.wordup.dev](https://docs.wordup.dev)


# Usage
<!-- usage -->
```sh-session
$ npm install -g wordup-cli
$ wordup COMMAND
running command...
$ wordup (-v|--version|version)
wordup-cli/1.0.0 darwin-x64 node-v10.15.0
$ wordup --help [COMMAND]
USAGE
  $ wordup COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`wordup cloud:auth`](#wordup-cloudauth)
* [`wordup cloud:clone`](#wordup-cloudclone)
* [`wordup cloud:project`](#wordup-cloudproject)
* [`wordup cloud:publish`](#wordup-cloudpublish)
* [`wordup export TYPE`](#wordup-export-type)
* [`wordup help [COMMAND]`](#wordup-help-command)
* [`wordup init`](#wordup-init)
* [`wordup list`](#wordup-list)
* [`wordup local:install`](#wordup-localinstall)
* [`wordup local:start`](#wordup-localstart)
* [`wordup local:stop`](#wordup-localstop)
* [`wordup snippet TYPE NAME`](#wordup-snippet-type-name)
* [`wordup wpcli [COMMAND]`](#wordup-wpcli-command)

## `wordup cloud:auth`

Authenticate the CLI with your wordup account

```
USAGE
  $ wordup cloud:auth

OPTIONS
  -l, --logout  Logout of your account

DESCRIPTION
  ...
  You will be redirect to the wordup.dev page.
```

_See code: [src/commands/cloud/auth.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/cloud/auth.js)_

## `wordup cloud:clone`

Clone current running WordPress installation to a new node in your wordup account

```
USAGE
  $ wordup cloud:clone

DESCRIPTION
  ...
  This command will automatically backup and upload your running WordPress installation to wordup.

  After cloning the project, your data will be deleted from our servers.
```

_See code: [src/commands/cloud/clone.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/cloud/clone.js)_

## `wordup cloud:project`

Create a new remote project on wordup.dev

```
USAGE
  $ wordup cloud:project

OPTIONS
  --public  Create a public project

DESCRIPTION
  ...
  Use this function to create a remote project on wordup.dev from your local project config.
```

_See code: [src/commands/cloud/project.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/cloud/project.js)_

## `wordup cloud:publish`

Publish your WordPress theme or plugin to your private theme/plugin directory on wordup.

```
USAGE
  $ wordup cloud:publish

OPTIONS
  --env=release|staging          (required) Specify the environment you want to publish to
  --increment=major|minor|patch  [default: minor] Increment a version by the specified level
  --token=token                  A provided project token

DESCRIPTION
  ...
  The private directory on wordup manages your WordPress plugin and theme projects in the cloud.

  After publishing the project, all WordPress installations can update your theme/plugin to the new project version.
```

_See code: [src/commands/cloud/publish.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/cloud/publish.js)_

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

_See code: [src/commands/export.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/export.js)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `wordup init`

Create a new wordup project in the current directoy

```
USAGE
  $ wordup init

OPTIONS
  --name=name                         A name for the new project
  --type=plugins|themes|installation  What type of WordPress project

DESCRIPTION
  ...
  After you have initialized a new project, you can start the docker development server with 'wordup local:install'
```

_See code: [src/commands/init.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/init.js)_

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

_See code: [src/commands/list.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/list.js)_

## `wordup local:install`

Install and start the WordPress development server

```
USAGE
  $ wordup local:install

OPTIONS
  -p, --port=port    [default: 8000] Install on a different port
  --archive=archive  Install from a wordup archive (needs to be located in your dist folder).
  --build            Build the WordPress docker container on your system
  --logs             Shows all stdout logs of this process
  --prompt           If you want to do the setup again

DESCRIPTION
  ...
  If there is no wpInstall config in .wordup/config.yml, a setup for your installation will be shown.

  The web frontend for the catched emails (MailHog) is available on localhost:[WORDPRESS_PORT + 1]

  Wordup will assign automatically a different default port, if the default port of 8000 is taken by another wordup 
  project.

  Note: Flags in this command overrule the wordup config.yml.

ALIASES
  $ wordup install
```

_See code: [src/commands/local/install.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/local/install.js)_

## `wordup local:start`

Start the WordPress development server

```
USAGE
  $ wordup local:start

OPTIONS
  --logs  Shows all stdout logs of this process

DESCRIPTION
  ...
  You can onl run this command if your development stack is installed.

ALIASES
  $ wordup run
  $ wordup start
```

_See code: [src/commands/local/start.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/local/start.js)_

## `wordup local:stop`

Stop the development server

```
USAGE
  $ wordup local:stop

OPTIONS
  -d, --delete           Deletes all attached volumes/data (WARNING: Your content in your WordPress installation will be
                         deleted)

  -p, --project=project  A project slug name

  --force                Force delete

  --logs                 Shows all stdout logs of this process

DESCRIPTION
  ...
  Optionally you can use -d to delete the whole installation, this includes all files in your WordPress installation.

ALIASES
  $ wordup stop
```

_See code: [src/commands/local/stop.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/local/stop.js)_

## `wordup snippet TYPE NAME`

Add code snippets like Gutenberg blocks, custom post types or taxonomies to your code

```
USAGE
  $ wordup snippet TYPE NAME

ARGUMENTS
  TYPE  (block|post-type|taxonomy) What type do you want to add to your project
  NAME  Name of the element you want to add

OPTIONS
  --logs  Shows all stdout logs of this process

DESCRIPTION
  ...
  This code snippets will be added to your current project source code. You can add as many as you want.
  Just include the generated php file in your main project file.

  As an example: wordup snippet block MyGutenbergBlock
```

_See code: [src/commands/snippet.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/snippet.js)_

## `wordup wpcli [COMMAND]`

Use an official WordPress CLI command on the current running project

```
USAGE
  $ wordup wpcli [COMMAND]

ARGUMENTS
  COMMAND  the wp cli command

OPTIONS
  --logs  Shows all stdout logs of this process

DESCRIPTION
  ...
  As an example: wordup wpcli post list. 

  If you run wordup wpcli without any argument, you will directly access the command line of the underlying docker 
  container.
```

_See code: [src/commands/wpcli.js](https://github.com/wordup-dev/wordup-cli/blob/v1.0.0/src/commands/wpcli.js)_
<!-- commandsstop -->

# Wordup for Visual Studio Code

If you use VSCode for your development, you can install our [VSCode extension](https://marketplace.visualstudio.com/items?itemName=wordup.wordup-code). This extension will integrate all wordup features in your favorite editor.

# Learn more

To learn more about wordup in general, visit: https://wordup.dev

# License / Contributing

wordup-cli is an open-source project. If you are interested in contributing to wordup-cli, 
feel free to join us.

See the [LICENSE](LICENSE) file for details.
