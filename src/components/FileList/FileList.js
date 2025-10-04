import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { supabase } from '../../supabase';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchFiles(user.id);
      } else {
        setLoading(false);
      }
    };

    getUser();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        fetchFiles(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setFiles([]);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Configurer un écouteur en temps réel pour les fichiers
  const fetchFiles = async (userId) => {
    try {
      setLoading(true);
      
      // Récupérer les fichiers de l'utilisateur
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      setFiles(data || []);
      setLoading(false);
      
      // Configurer un écouteur en temps réel pour les mises à jour
      const subscription = supabase
        .channel('files_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'files', filter: `user_id=eq.${userId}` },
          async () => {
            // Rafraîchir les données quand il y a un changement
            const { data: refreshedData } = await supabase
              .from('files')
              .select('*')
              .eq('user_id', userId)
              .order('upload_date', { ascending: false });
              
            if (refreshedData) setFiles(refreshedData);
          }
        )
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des fichiers:', error);
      setError('Impossible de charger vos fichiers. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const handleDelete = async (fileId, filePath) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier?')) {
      return;
    }

    try {
      // Récupérer les informations du fichier avant suppression
      const { data: fileData } = await supabase
        .from('files')
        .select('file_size')
        .eq('id', fileId)
        .single();

      // Supprimer le fichier du stockage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Supprimer les métadonnées de la base de données
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Mettre à jour l'espace utilisé dans le profil utilisateur
      if (fileData && user) {
        // D'abord, obtenir l'espace actuellement utilisé
        const { data: userData } = await supabase
          .from('users')
          .select('storage_used')
          .eq('id', user.id)
          .single();

        if (userData) {
          const newStorageUsed = Math.max(0, userData.storage_used - fileData.file_size);
          
          // Mettre à jour l'espace utilisé
          await supabase
            .from('users')
            .update({ storage_used: newStorageUsed })
            .eq('id', user.id);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      setError('Erreur lors de la suppression du fichier. Veuillez réessayer.');
    }
  };

  // Formater la taille du fichier
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Formater la date
  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Mes fichiers</Card.Title>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <div className="text-center my-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Chargement...</span>
            </Spinner>
          </div>
        ) : !user ? (
          <Alert variant="info">Veuillez vous connecter pour voir vos fichiers.</Alert>
        ) : files.length === 0 ? (
          <Alert variant="info">Vous n'avez pas encore uploadé de fichiers.</Alert>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Taille</th>
                  <th>Date d'upload</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.file_name}</td>
                    <td>{file.file_type}</td>
                    <td>{formatBytes(file.file_size)}</td>
                    <td>{formatDate(file.upload_date)}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        href={file.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Télécharger
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(file.id, file.path)}
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default FileList;