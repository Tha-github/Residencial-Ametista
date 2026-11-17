import { PUBLIC_DEPLOY_ENV } from 'astro:env/client';

/** Produção é o único ambiente indexável e sem avisos de pendência. */
export const isProduction = PUBLIC_DEPLOY_ENV === 'production';
export const showDevNotices = !isProduction;
