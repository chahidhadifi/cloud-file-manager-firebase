// Import des fonctions nécessaires de Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (à remplacer par vos propres valeurs)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Initialisation de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Export du client pour utilisation dans d'autres fichiers
export { supabase };