import React, { useState, useEffect } from 'react';
import { ProgressBar, Button, Alert, Card } from 'react-bootstrap';
import { supabase } from '../../supabase';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 0 });
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchStorageInfo(user.id);
      }
    };

    getUser();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        fetchStorageInfo(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStorageInfo({ used: 0, limit: 0 });
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const fetchStorageInfo = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('storage_used, storage_limit')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setStorageInfo({
          used: data.storage_used || 0,
          limit: data.storage_limit || 1073741824 // 1 GB par défaut
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des infos de stockage:', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    if (!user) {
      setError('Vous devez être connecté pour uploader des fichiers');
      return;
    }

    // Vérifier si l'utilisateur a assez d'espace
    if (file.size + storageInfo.used > storageInfo.limit) {
      setError('Espace de stockage insuffisant');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');
    setSuccess('');

    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload du fichier avec suivi de progression
      const { data, error } = await supabase.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const calculatedProgress = Math.round((progress.loaded / progress.total) * 100);
            setProgress(calculatedProgress);
          }
        });

      if (error) throw error;

      // Obtenir l'URL publique du fichier
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Ajouter les métadonnées du fichier à la base de données
      const { error: insertError } = await supabase
        .from('files')
        .insert([
          {
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            upload_date: new Date(),
            download_url: urlData.publicUrl,
            user_id: user.id,
            path: filePath
          }
        ]);

      if (insertError) throw insertError;

      // Mettre à jour l'espace utilisé
      const newStorageUsed = storageInfo.used + file.size;
      const { error: updateError } = await supabase
        .from('users')
        .update({ storage_used: newStorageUsed })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Mettre à jour l'état local
      setStorageInfo({
        ...storageInfo,
        used: newStorageUsed
      });

      setSuccess('Fichier uploadé avec succès!');
      setFile(null);
    } catch (error) {
      setError('Erreur lors de l\'upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Convertir les octets en format lisible
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Calculer le pourcentage d'espace utilisé
  const usedPercentage = storageInfo.limit > 0 ? (storageInfo.used / storageInfo.limit) * 100 : 0;

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Upload de fichier</Card.Title>
        
        {/* Affichage de l'espace de stockage */}
        <div className="mb-3">
          <h6>Espace de stockage</h6>
          <ProgressBar 
            now={usedPercentage} 
            variant={usedPercentage > 90 ? "danger" : usedPercentage > 70 ? "warning" : "info"} 
            className="mb-2" 
          />
          <small>
            {formatBytes(storageInfo.used)} utilisés sur {formatBytes(storageInfo.limit)} 
            ({usedPercentage.toFixed(1)}%)
          </small>
        </div>
        
        {/* Messages d'erreur et de succès */}
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {/* Sélection de fichier */}
        <div className="mb-3">
          <input 
            type="file" 
            className="form-control" 
            onChange={handleFileChange} 
            disabled={uploading || !user}
          />
        </div>
        
        {/* Barre de progression */}
        {uploading && (
          <div className="mb-3">
            <ProgressBar 
              now={progress} 
              label={`${progress}%`} 
              animated 
              variant="success" 
            />
          </div>
        )}
        
        {/* Bouton d'upload */}
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading || !user}
          variant="primary"
        >
          {uploading ? 'Upload en cours...' : 'Uploader'}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default FileUpload;