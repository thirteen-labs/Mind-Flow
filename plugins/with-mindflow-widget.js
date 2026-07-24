const {
  withXcodeProject,
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP = 'group.com.mindflow.app';
const WIDGET_TARGET_NAME = 'MindFlowWidget';
const WIDGET_BUNDLE_ID = '${PRODUCT_BUNDLE_IDENTIFIER}.widget';

module.exports = function withMindFlowWidget(config) {
  config = withWidgetAppGroup(config);
  config = withWidgetXcodeTarget(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetFiles(config);
  return config;
};

function withWidgetAppGroup(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults = cfg.modResults || {};
    return cfg;
  });
}

function withWidgetXcodeTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;

    // Add App Group entitlement
    const target = xcodeProject.getTarget('com.mindflow.app');
    if (target) {
      const entitlements = {
        'com.apple.security.application-groups': [APP_GROUP],
      };
      xcodeProject.addEntitlements('com.apple.security.application-groups', entitlements);
    }

    // Add widget extension target
    xcodeProject.addTarget(
      WIDGET_TARGET_NAME,
      WIDGET_TARGET_NAME,
      'com.apple.product-type.app-extension'
    );

    // Add Swift source files
    const widgetSrcDir = 'widgets/MindFlowWidget';
    xcodeProject.addSourceFile(`${widgetSrcDir}/MindFlowWidget.swift`, { target: WIDGET_TARGET_NAME });
    xcodeProject.addSourceFile(`${widgetSrcDir}/MindFlowWidgetBundle.swift`, { target: WIDGET_TARGET_NAME });

    // Embed the widget in the main app
    if (target) {
      xcodeProject.addBuildPhase(
        ['PBXShellScriptBuildPhase'],
        'Embed App Extensions',
        target.uuid,
        'embedAppExtensions'
      );
    }

    return cfg;
  });
}

function withAndroidWidgetManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    mainApplication['receiver'] = mainApplication['receiver'] || [];
    mainApplication['receiver'].push({
      $: {
        'android:name': '.MindFlowWidgetProvider',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/mindflow_widget_info',
          },
        },
      ],
    });

    return cfg;
  });
}

function withAndroidWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidPath = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main');
      const widgetSrc = path.join(cfg.modRequest.projectRoot, 'widgets/MindFlowWidget');

      // Copy Kotlin source
      const kotlinDir = path.join(androidPath, 'java/com/mindflow/widget');
      fs.mkdirSync(kotlinDir, { recursive: true });
      const ktSrc = path.join(widgetSrc, 'MindFlowWidget.kt');
      if (fs.existsSync(ktSrc)) {
        fs.copyFileSync(ktSrc, path.join(kotlinDir, 'MindFlowWidgetProvider.kt'));
      }

      // Copy layout XML
      const layoutDir = path.join(androidPath, 'res/layout');
      fs.mkdirSync(layoutDir, { recursive: true });
      const layoutSrc = path.join(widgetSrc, 'res/layout/mindflow_widget.xml');
      if (fs.existsSync(layoutSrc)) {
        fs.copyFileSync(layoutSrc, path.join(layoutDir, 'mindflow_widget.xml'));
      }

      // Copy widget info XML
      const xmlDir = path.join(androidPath, 'res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      const infoSrc = path.join(widgetSrc, 'res/xml/mindflow_widget_info.xml');
      if (fs.existsSync(infoSrc)) {
        fs.copyFileSync(infoSrc, path.join(xmlDir, 'mindflow_widget_info.xml'));
      }

      return cfg;
    },
  ]);
}
