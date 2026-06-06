import { registerRootComponent } from 'expo';
import App from './src/App';

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e configura o ambiente quer no Expo Go quer numa build nativa.
registerRootComponent(App);
