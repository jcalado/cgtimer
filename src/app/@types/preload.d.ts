import { api } from '../../preload';

declare global {
    interface Window { api: typeof api;}
}