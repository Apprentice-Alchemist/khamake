var fs = require('fs-extra');
var path = require('path');
var XmlWriter = require('./XmlWriter.js');

function copyAndReplace(from, to, names, values) {
	var data = fs.readFileSync(from, { encoding: 'utf8' });
	for (var i = 0; i < names.length; ++i) {
		data = data.replaceAll(names[i], values[i]);
	}
	fs.writeFileSync(to, data, { encoding: 'utf8' });
}

function IntelliJ(projectdir, options) {
    var indir = path.join(__dirname, 'Data', 'intellij');
    var outdir = path.join(projectdir, 'project-' + options.system + '-intellij');

    var sources = '';
    for (var i = 0; i < options.sources.length; ++i) {
		if (path.isAbsolute(options.sources[i])) {
			sources += '      <sourceFolder url="file://' + options.sources[i] + '" isTestSource="false" />\n';
		}
		else {
			sources += '      <sourceFolder url="file://$MODULE_DIR$/' + path.relative(outdir, path.join(options.from, options.sources[i])).replaceAll('\\', '/') + '" isTestSource="false" />\n';
		}
	}

	var args = '';

    var defines = '';
    for (var i = 0; i < options.defines.length; ++i) {
		var define = options.defines[i];
		defines += define;
		if (i < options.defines.length - 1) defines += ',';
	}

	var target;
	switch (options.language) {
		case 'cpp':
			target = 'C++';
			break;
		case 'as':
			target = 'Flash';
			args = '-swf-version 16.0';
			break;
		case 'cs':
			target = 'C#';
			args = '-net-std ' + path.relative(outdir, path.join(options.haxeDirectory, 'netlib'));
			break;
		case 'java':
			target = 'Java';
			args = '-java-lib ' + path.relative(outdir, path.join(options.haxeDirectory, 'hxjava', 'hxjava-std.jar'));
			break;
		case 'js':
			target = 'JavaScript';
			break;
	}

    fs.copySync(path.join(indir, 'name.iml'), path.join(outdir, options.name + '.iml'));
	copyAndReplace(path.join(indir, 'name.iml'), path.join(outdir, options.name + '.iml'), ['{name}', '{sources}', '{target}', '{system}', '{args}'], [options.name, sources, target, options.system, args]);

	fs.copySync(path.join(indir, 'idea', 'compiler.xml'), path.join(outdir, '.idea', 'compiler.xml'));
	copyAndReplace(path.join(indir, 'idea', 'haxe.xml'), path.join(outdir, '.idea', 'haxe.xml'), ['{defines}'], [defines]);
	fs.copySync(path.join(indir, 'idea', 'misc.xml'), path.join(outdir, '.idea', 'misc.xml'));
	copyAndReplace(path.join(indir, 'idea', 'modules.xml'), path.join(outdir, '.idea', 'modules.xml'), ['{name}'], [options.name]);
	fs.copySync(path.join(indir, 'idea', 'vcs.xml'), path.join(outdir, '.idea', 'vcs.xml'));
	copyAndReplace(path.join(indir, 'idea', 'name'), path.join(outdir, '.idea', '.name'), ['{name}'], [options.name]);
	fs.copySync(path.join(indir, 'idea', 'copyright', 'profiles_settings.xml'), path.join(outdir, '.idea', 'copyright', 'profiles_settings.xml'));
}

function hxml(projectdir, options) {
	var data = '';
	for (var i = 0; i < options.sources.length; ++i) {
		if (path.isAbsolute(options.sources[i])) {
			data += '-cp ' + options.sources[i] + '\n';
		}
		else {
			data += '-cp ' + path.relative(projectdir, path.join(options.from, options.sources[i])) + '\n'; // from.resolve('build').relativize(from.resolve(this.sources[i])).toString());
		}
	}
	for (var d in options.defines) {
		var define = options.defines[d];
		data += '-D ' + define + '\n';
	}
	if (options.language === 'cpp') {
		data += '-cpp ' + path.normalize(options.to) + '\n';
	}
	else if (options.language === 'cs') {
		data += '-cs ' + path.normalize(options.to) + '\n';
		if (fs.existsSync(options.haxeDirectory) && fs.statSync(options.haxeDirectory).isDirectory()) {
			data += '-net-std ' + path.relative(projectdir, path.join(options.haxeDirectory, 'netlib')) + '\n';
		}
	}
	else if (options.language === 'java') {
		data += '-java ' + path.normalize(options.to) + '\n';
		if (fs.existsSync(options.haxeDirectory) && fs.statSync(options.haxeDirectory).isDirectory()) {
			data += '-java-lib ' + path.relative(projectdir, path.join(options.haxeDirectory, 'hxjava', 'hxjava-std.jar')) + '\n';
		}
	}
	else if (options.language === 'js') {
		data += '-js ' + path.normalize(options.to) + '\n';
	}
	else if (options.language === 'as') {
		data += '-swf ' + path.normalize(options.to) + '\n';
		data += '-swf-version 16.0\n';
	}
	data += '-main Main' + '\n';
	fs.outputFileSync(path.join(projectdir, 'project-' + options.system + '.hxml'), data);
}

function FlashDevelop(projectdir, options) {
	var platform;

	switch (options.language) {
		case 'cpp':
			platform = 'C++';
			break;
		case 'as':
			platform = 'Flash Player';
			break;
		case 'cs':
			platform = 'C#';
			break;
		case 'java':
			platform = 'Java';
			break;
		case 'js':
			platform = 'JavaScript';
			break;
	}

	var output = {
		n: 'output',
		e: [
			{
				n: 'movie',
				outputType: 'Application'
			},
			{
				n: 'movie',
				input: ''
			},
			{
				n: 'movie',
				path: path.normalize(options.to)
			},
			{
				n: 'movie',
				fps: 60
			},
			{
				n: 'movie',
				width: options.width
			},
			{
				n: 'movie',
				height: options.height
			},
			{
				n: 'movie',
				version: 16
			},
			{
				n: 'movie',
				minorVersion: 0
			},
			{
				n: 'movie',
				platform: platform
			},
			{
				n: 'movie',
				background: '#FFFFFF'
			}
		]
	};

	if (fs.existsSync(options.haxeDirectory) && fs.statSync(options.haxeDirectory).isDirectory()) {
		output.e.push({
			n: 'movie',
			preferredSDK: path.relative(projectdir, options.haxeDirectory)
		});
	}

	var classpaths = {
		n: 'classpaths',
		e: [

		]
	};

	for (var i = 0; i < options.sources.length; ++i) {
		if (path.isAbsolute(options.sources[i])) {
			classpaths.e.push({
				n: 'class',
				path: options.sources[i]
			});
		}
		else {
			classpaths.e.push({
				n: 'class',
				path: path.relative(projectdir, path.join(options.from, options.sources[i]))
			});
		}
	}

	var otheroptions = [
		{
			n: 'option',
			showHiddenPaths: 'False'
		}
	];

	if (options.language === 'cpp') {
		otheroptions.push({
			n: 'option',
			testMovie: 'Custom'
		});
		otheroptions.push({
			n: 'option',
			testMovieCommand: 'run_' + options.system + '.bat'
		});
	}
	else if (options.language === 'cs' || options.language === 'java') {
		otheroptions.push({
			n: 'option',
			testMovie: 'OpenDocument'
		});
		otheroptions.push({
			n: 'option',
			testMovieCommand: ''
		});
	}
	else if (options.language === 'js') {
		otheroptions.push({
			n: 'option',
			testMovie: 'Webserver'
		});
		otheroptions.push({
			n: 'option',
			testMovieCommand: path.join(path.parse(options.to).dir, 'index.html')
		});
	}
	else {
		otheroptions.push({
			n: 'option',
			testMovie: 'Default'
		});
	}

	var def = '';
	for (var d in options.defines) {
		def += '-D ' + options.defines[d] + '&#xA;';
	}
	if (options.language === 'java' && fs.existsSync(options.haxeDirectory) && fs.statSync(options.haxeDirectory).isDirectory()) {
		def += '-java-lib ' + path.relative(projectdir, path.join(options.haxeDirectory, 'hxjava', 'hxjava-std.jar')) + '&#xA;';
	}
	if (options.language === 'cs' && fs.existsSync(options.haxeDirectory) && fs.statSync(options.haxeDirectory).isDirectory()) {
		def += '-net-std ' + path.relative(projectdir, path.join(options.haxeDirectory, 'netlib')) + '&#xA;';
	}

	var project = {
		n: 'project',
		version: '2',
		e: [
			'Output SWF options',
			output,
			'Other classes to be compiled into your SWF',
			classpaths,
			'Build options',
			{
				n: 'build',
				e: [
					{
						n: 'option',
						directives: ''
					},
					{
						n: 'option',
						flashStrict: 'False'
					},
					{
						n: 'option',
						noInlineOnDebug: 'False'
					},
					{
						n: 'option',
						mainClass: 'Main'
					},
					{
						n: 'option',
						enabledebug: options.language === 'as' ? 'True' : 'False'
					},
					{
						n: 'option',
						additional: def
					}
				]
			},
			'haxelib libraries',
			{
				n: 'haxelib',
				e: [
					'example: <library name="..." />'
				]
			},
			'Class files to compile (other referenced classes will automatically be included)',
			{
				n: 'compileTargets',
				e: [
					{
						n: 'compile',
						path: '..\\Sources\\Main.hx'
					}
				]
			},
			'Paths to exclude from the Project Explorer tree',
			{
				n: 'hiddenPaths',
				e: [
					'example: <hidden path="..." />'
				]
			},
			'Executed before build',
			{
				n: 'preBuildCommand'
			},
			'Executed after build',
			{
				n: 'postBuildCommand',
				alwaysRun: 'False'
			},
			'Other project options',
			{
				n: 'options',
				e: otheroptions
			},
			'Plugin storage',
			{
				n: 'storage'
			}
		]
	};

	XmlWriter(project, path.join(projectdir, 'project-' + options.system + '.hxproj'));
}

module.exports = function (projectdir, options) {
	options.defines.push('kha');
	FlashDevelop(projectdir, options);
	IntelliJ(projectdir, options);
	hxml(projectdir, options);
};
