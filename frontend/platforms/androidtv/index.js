/**
 * nself-tv Android TV Entry Point
 *
 * TODO: Full implementation needed:
 * - D-pad navigation handling
 * - Leanback UI components
 * - 10-foot interface design
 * - Voice search integration
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
