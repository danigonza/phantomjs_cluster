# Express PhantomJS

A simple screenshot web service powered by [Express](http://expressjs.com) and [PhantomJS](http://www.phantomjs.org/). Basend on the project [screenshot-as-service](https://github.com/fzaninotto/screenshot-as-a-service) but with multiple phantomjs servers and a redis bd to save the work charge of the phantomjs servers.

## Setup

First [install](http://code.google.com/p/phantomjs/wiki/Installation) phantomjs, then clone this repo and install the deps:

```
$ npm install
```

Run the app:

```
$ node app
Express server listening on port 3000
```

## Usage

For a quick test with the command line, type:

```sh
$ curl http://localhost:3000/?address=www.google.com&output=/tmp/out.png&type=0 > google.png
```

## Configuration

Create a `config/development.yaml` or a `config/production.yaml` to override any of the settings found in the `config/default.yaml`:

```yml
rasterizer:
  command: phantomjs   # phantomjs executable
  port: 3001           # internal service port. No need to allow inbound or outbound access to this port
  viewport: '1024x600' # browser window size. Height frows according to the content
cache:
  lifetime: 60000      # one minute, set to 0 for no cache
server:
  port: 3000           # main service port
```

For instance, if you want to setup a proxy for phantomjs, create a `config/development.yaml` as follows:

```yml
rasterizer:
  command: 'phantomjs --proxy=myproxy:1234'
```