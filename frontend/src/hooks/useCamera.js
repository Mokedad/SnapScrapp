import { useState, useCallback, useEffect, useRef } from 'react';

export function useCamera() {
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [permissionState, setPermissionState] = useState('prompt');
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check camera permission on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'camera' }).then((result) => {
        setPermissionState(result.state);
        result.onchange = () => setPermissionState(result.state);
      }).catch(() => {
        setPermissionState('prompt');
      });
    }
  }, []);

  // Open camera
  const openCamera = useCallback(async () => {
    // Use native file input with capture for mobile
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return true;
    }
    
    // Fallback to getUserMedia for web
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setShowCameraView(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch (err) {
      console.error('Camera access denied:', err);
      setPermissionState('denied');
      return false;
    }
  }, []);

  // Close camera
  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
    setCameraZoom(1);
  }, [cameraStream]);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    closeCamera();
    return imageData;
  }, [closeCamera]);

  // Handle file input change (for native camera)
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setCapturedImage(imageData);
        resolve(imageData);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Compress image
  const compressImage = useCallback((base64Image, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = base64Image;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return {
    showCameraView,
    cameraStream,
    cameraZoom,
    permissionState,
    capturedImage,
    videoRef,
    fileInputRef,
    openCamera,
    closeCamera,
    capturePhoto,
    handleFileSelect,
    compressImage,
    setCameraZoom,
    setCapturedImage
  };
}

export default useCamera;
