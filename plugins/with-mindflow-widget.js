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

module.exports = function withMindFlowWidget(config) {
  try {
    config = withWidgetAppGroup(config);
  } catch (e) {
    console.warn('[withMindFlowWidget] withWidgetAppGroup failed:', e?.message);
  }
  try {
    config = withWidgetXcodeTarget(config);
  } catch (e) {
    console.warn('[withMindFlowWidget] withWidgetXcodeTarget failed:', e?.message);
  }
  try {
    config = withAndroidWidgetManifest(config);
  } catch (e) {
    console.warn('[withMindFlowWidget] withAndroidWidgetManifest failed:', e?.message);
  }
  try {
    config = withAndroidWidgetFiles(config);
  } catch (e) {
    console.warn('[withMindFlowWidget] withAndroidWidgetFiles failed:', e?.message);
  }
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
    if (!xcodeProject || typeof xcodeProject.getFirstProject !== 'function') {
      console.warn('[withMindFlowWidget] xcodeProject API not available, skipping iOS widget target');
      return cfg;
    }

    try {
      // Only attempt target manipulations if APIs exist — newer Xcode proj libraries may differ.
      // Guard every call so a missing method doesn't crash prebuild.
      if (typeof xcodeProject.getTarget === 'function') {
        const target = xcodeProject.getTarget('com.mindflow.app');
        // Entitlements / target creation are optional — skip if APIs are missing.
        if (target && typeof xcodeProject.addEntitlements === 'function') {
          try {
            const entitlements = {
              'com.apple.security.application-groups': [APP_GROUP],
            };
            xcodeProject.addEntitlements('com.apple.security.application-groups', entitlements);
          } catch {}
        }

        if (typeof xcodeProject.addTarget === 'function') {
          try {
            xcodeProject.addTarget(
              WIDGET_TARGET_NAME,
              WIDGET_TARGET_NAME,
              'com.apple.product-type.app-extension'
            );
          } catch {}
        }

        const widgetSrcDir = 'widgets/MindFlowWidget';
        if (typeof xcodeProject.addSourceFile === 'function') {
          try {
            xcodeProject.addSourceFile(`${widgetSrcDir}/MindFlowWidget.swift`, { target: WIDGET_TARGET_NAME });
          } catch {}
          try {
            xcodeProject.addSourceFile(`${widgetSrcDir}/MindFlowWidgetBundle.swift`, { target: WIDGET_TARGET_NAME });
          } catch {}
        }

        if (target && typeof xcodeProject.addBuildPhase === 'function') {
          try {
            xcodeProject.addBuildPhase(
              ['PBXShellScriptBuildPhase'],
              'Embed App Extensions',
              target.uuid,
              'embedAppExtensions'
            );
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[withMindFlowWidget] iOS project manipulation skipped:', e?.message);
    }

    return cfg;
  });
}

function withAndroidWidgetManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    try {
      const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

      mainApplication['receiver'] = mainApplication['receiver'] || [];
      const exists = mainApplication['receiver'].some(
        (r) => r.$?.['android:name'] === '.MindFlowWidgetProvider'
      );
      if (!exists) {
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
      }
    } catch (e) {
      console.warn('[withMindFlowWidget] Android manifest manipulation skipped:', e?.message);
    }

    return cfg;
  });
}

function withAndroidWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      try {
        if (!cfg.modRequest.platformProjectRoot) return cfg;
        const androidPath = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main');
        const widgetSrc = path.join(cfg.modRequest.projectRoot, 'widgets/MindFlowWidget');
        if (!fs.existsSync(widgetSrc)) return cfg;

        // Copy Kotlin source
        const kotlinDir = path.join(androidPath, 'java/com/mindflow/app');
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

        // Copy string resources
        const valuesDir = path.join(androidPath, 'res/values');
        fs.mkdirSync(valuesDir, { recursive: true });
        const stringsSrc = path.join(widgetSrc, 'res/values/widget_strings.xml');
        if (fs.existsSync(stringsSrc)) {
          fs.copyFileSync(stringsSrc, path.join(valuesDir, 'widget_strings.xml'));
        }
      } catch (e) {
        console.warn('[withMindFlowWidget] Android widget file copy skipped:', e?.message);
      }

      return cfg;
    },
  ]);
}
