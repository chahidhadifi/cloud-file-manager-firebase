# Configuration de Supabase pour Cloud File Manager

## Prérequis

- Avoir un compte Supabase (gratuit)
- Node.js et npm installés sur votre machine
- Le projet React "Cloud File Manager" créé

## Étapes de configuration

### 1. Créer un projet Supabase

1. Rendez-vous sur [Supabase Dashboard](https://app.supabase.io/)
2. Cliquez sur "New Project"
3. Donnez un nom à votre projet (ex: "cloud-file-manager")
4. Définissez un mot de passe pour la base de données
5. Sélectionnez la région la plus proche de vous
6. Cliquez sur "Create new project"

### 2. Installer les dépendances Supabase dans votre projet React

Dans le terminal, à la racine de votre projet, exécutez :

```bash
npm install @supabase/supabase-js
npm install react-bootstrap bootstrap
```

### 3. Configurer Supabase dans votre application

1. Dans le dashboard Supabase, allez dans "Settings" > "API"
2. Copiez votre "URL" et votre "anon public" key

3. Créez un fichier `src/supabase.js` dans votre projet avec le contenu suivant :

```javascript
// Import des fonctions nécessaires de Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (à remplacer par vos propres valeurs)
const supabaseUrl = 'VOTRE_URL_SUPABASE';
const supabaseKey = 'VOTRE_CLE_API_SUPABASE';

// Initialisation de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Export du client pour utilisation dans d'autres fichiers
export { supabase };
```

### 4. Configurer l'authentification Supabase

1. Dans le dashboard Supabase, allez dans "Authentication" > "Providers"
2. Activez le provider "Email"
3. Vous pouvez configurer les options comme "Confirm email" selon vos besoins

### 5. Configurer Supabase Storage

1. Dans le dashboard Supabase, allez dans "Storage"
2. Cliquez sur "Create new bucket"
3. Nommez votre bucket "files"
4. Configurez les permissions du bucket :

```sql
-- Permettre aux utilisateurs authentifiés d'uploader des fichiers
CREATE POLICY "Utilisateurs authentifiés peuvent uploader des fichiers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permettre aux utilisateurs de lire leurs propres fichiers
CREATE POLICY "Utilisateurs peuvent lire leurs propres fichiers"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Utilisateurs peuvent supprimer leurs propres fichiers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. Configurer Supabase Database

1. Dans le dashboard Supabase, allez dans "SQL Editor"
2. Créez les tables nécessaires avec le script SQL suivant :

```sql
-- Table pour stocker les informations des fichiers
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir uniquement leurs fichiers
CREATE POLICY "Utilisateurs peuvent voir leurs propres fichiers"
ON files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres fichiers
CREATE POLICY "Utilisateurs peuvent insérer leurs propres fichiers"
ON files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Utilisateurs peuvent supprimer leurs propres fichiers"
ON files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Table pour stocker les informations des utilisateurs
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 1073741824, -- 1 GB en octets
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir uniquement leur profil
CREATE POLICY "Utilisateurs peuvent voir leur propre profil"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Politique pour permettre aux utilisateurs de mettre à jour uniquement leur profil
CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

```sql
-- Politique pour permettre aux utilisateurs de créer leur propre profil
CREATE POLICY "Utilisateurs peuvent créer leur propre profil"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
```

### 7. Configurer le déploiement

Supabase s'intègre bien avec plusieurs plateformes de déploiement comme Vercel, Netlify ou GitHub Pages.

#### Déploiement avec Vercel

1. Créez un compte sur [Vercel](https://vercel.com/)
2. Installez Vercel CLI :

```bash
npm install -g vercel
```

3. Connectez-vous à Vercel depuis le terminal :

```bash
vercel login
```

4. Déployez votre application :

```bash
vercel
```

5. Suivez les instructions pour configurer votre projet

### 8. Variables d'environnement

Pour sécuriser vos clés API, utilisez des variables d'environnement :

1. Créez un fichier `.env.local` à la racine de votre projet (ajoutez-le à `.gitignore`) :

```
REACT_APP_SUPABASE_URL=votre_url_supabase
REACT_APP_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

2. Modifiez votre fichier `src/supabase.js` :

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
```

## Structure des données

### Table "files"

Chaque enregistrement dans cette table représente un fichier uploadé et contient :

```
{
  id: "uuid",
  file_name: "nom_du_fichier.ext",
  file_type: "type/mime",
  file_size: 12345,  // taille en octets
  upload_date: "timestamp",
  download_url: "https://...",
  user_id: "uuid_utilisateur",
  path: "chemin/dans/storage",
  created_at: "timestamp"
}
```

### Table "users"

Chaque enregistrement dans cette table représente un utilisateur et contient :

```
{
  id: "uuid",
  email: "utilisateur@exemple.com",
  storage_used: 12345,  // espace utilisé en octets
  storage_limit: 1073741824,  // limite en octets (ex: 1 GB)
  created_at: "timestamp"
}
```

## Limites et quotas

Supabase offre un plan gratuit généreux :

- Base de données PostgreSQL : 500 Mo
- Storage : 1 GB
- Authentification : Illimitée
- API : 50,000 requêtes/jour (~ 1.5 millions/mois)
- Transfert : 2 GB/mois

Pour plus d'informations, consultez la [documentation officielle de Supabase](https://supabase.com/pricing).