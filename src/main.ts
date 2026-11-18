import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/manrope/index.css';
import './styles/site.css';
import { boot, route } from './app';
import { ROUTES } from './routes';

ROUTES.forEach(([re, page]) => route(re, page));
boot();
