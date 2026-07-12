import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => {
    return {
      // Build : chemins relatifs, compatibles avec Vercel qui sert à la racine.
      // Dev : Vite ignore la base relative (traitée comme '/') et sert le graphe de
      // modules en chemins absolus ; le proxy code-server /proxy/3000/ ampute le
      // préfixe et casse ces chemins. On sert donc le dev sous /absproxy/3000/,
      // le endpoint code-server qui conserve le préfixe.
      base: command === 'build' ? './' : '/absproxy/3000/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Accès dev via le proxy code-server (https://code.rochane.fr/proxy/3000/)
        allowedHosts: ['code.rochane.fr'],
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
