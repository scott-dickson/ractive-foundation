var through = require('through2'),
	gulputil = require('gulp-util'),
	Ractive = require('ractive'),
	marked = require('marked'),
	fs = require('fs'),
	find = require('find'),
	_ = require('lodash'),
	path = require('path'),
	makeHTML = require('json2htmljson2css').makeHTML;

var PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-concat-documentation';

function renderDocumentation() {
	var stream = through.obj(function (file, enc, callback) {

		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		try {

			var pathComponents = file.history[0].split(path.sep),
				componentName = pathComponents.slice(-2)[0];

            var doco = makeHTML([
                {
                    tag: 'h1',
                    content: componentName
                }, {
                    tag: 'br'
                }
            ]);

            doco += marked(String(file.contents));

            var directory = pathComponents.slice(0, -1);

            var interfaceDefinitionFilename = directory.slice(0);
            interfaceDefinitionFilename.push("interface.json");
            interfaceDefinitionFilename = interfaceDefinitionFilename.join(path.sep);

            // load the interface specification
            var interfaceSpecJson = JSON.parse(fs.readFileSync(interfaceDefinitionFilename));

            // document the permitted model fields
           doco += makeHTML([
            {
                tag: 'hr'
            },
            {
                tag: 'h3',
                content: "Data Model"
            }
            ]);
 
                _.forEach(_.zipObject(_.keys(interfaceSpecJson.data), _.values(interfaceSpecJson.data)),function(value, key) {
                    doco += makeHTML([
                    {
                        tag: 'h4',
                        content: key
                    },
                    {
                        tag: 'p',
                        content: value
                    }
                    ]);
                });

            // document the events handled
           doco += makeHTML([
            {
                tag: 'hr'
            },
            {
                tag: 'h3',
                content: "Events"
            }
            ]);
 
                _.forEach(_.zipObject(_.keys(interfaceSpecJson.events), _.values(interfaceSpecJson.events)),function(value, key) {
                    doco += makeHTML([
                    {
                        tag: 'h4',
                        content: key
                    },
                    {
                        tag: 'p',
                        content: value
                    }
                    ]);
                });
 
            doco += makeHTML([
            {
                tag: 'hr'
            }]);
 
			directory.push('use_cases');
			directory = directory.join(path.sep);

			// iterate over all use cases for the component
			doco += _.map(find.fileSync(/.*\.json/, directory), function (usecase) {

				var json = JSON.parse(fs.readFileSync(usecase));

				var componentObj = {
					// rendering component props. key="value"
					tag: componentName,
					attr: _.zipObject(_.keys(json.data), _.values(json.data)),
					content: ''
				};

				return makeHTML([
					{
						tag: 'h2',
						content: 'Use case: ' + json.title
					},
					componentObj,
					{
						tag: 'pre',
						content: [{
							tag: 'code',
							content:  _.escape(makeHTML([componentObj]))
						}]
					}
				]);

			}).join('');

			file.contents = new Buffer(
                "<script>var ractive = new Ractive({el: 'doco', components: RactiveF.components, template: 'Last Event: {{eventName}}"
                 + doco.replace(/(\r\n|\n|\r)/gm,'') 
                 +  "'});\n"  
                 + "ractive.on('*.*', function() { console.log(\"EVENT \" + this.event.name); this.set('eventName', this.event.name)});</script>"
                 );

			this.push(file);
		}

		catch (e) {
			console.warn('Error caught: ' + e);
			this.push(file);
			return callback();
		}

		callback();
	});

	return stream;
}


module.exports = renderDocumentation;