'use strict';
const path = require('path');
const fs = require('fs');
const childprocess = require('child_process');
const {isElectron, fixPathForAsarUnpack} = require('electron-util/node');
const macosVersion = require('macos-version');

const binary = path.join(fixPathForAsarUnpack(__dirname), 'screen-capture-permissions');

const permissionExists = macosVersion.isGreaterThanOrEqualTo('10.15');

let filePath;

if (isElectron) {
	const {api, openSystemPreferences} = require('electron-util');

	exports.openSystemPreferences = () => openSystemPreferences('security', 'Privacy_ScreenCapture');

	filePath = api.app && path.join(api.app.getPath('userData'), '.has-app-requested-screen-capture-permissions');
}

exports.hasScreenCapturePermission = () => {
	if (!permissionExists) {
		return true;
	}

	const stdout = childprocess.execSync(binary).toString();
	const hasPermission = stdout.indexOf('true') > -1;

	if (!hasPermission && filePath) {
		try {
			fs.writeFileSync(filePath, '');
		} catch (error) {
			if (error.code === 'ENOENT') {
				fs.mkdirSync(path.dirname(filePath));
				fs.writeFileSync(filePath, '');
			}

			throw error;
		}
	}

	return hasPermission;
};

exports.hasPromptedForPermission = () => {
	if (!permissionExists) {
		return false;
	}

	if (filePath && fs.existsSync(filePath)) {
		return true;
	}

	return false;
};

exports.resetPermissions = ({bundleId = ''} = {}) => {
	try {
		childprocess.execSync('tccutil', ['reset', 'ScreenCapture', bundleId].filter(Boolean));

		if (filePath && fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		return true;
	} catch (error) {
		return false;
	}
};
