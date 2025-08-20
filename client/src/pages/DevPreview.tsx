const handlePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dev/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      }).catch(err => {
        console.error('Network error:', err);
        throw new Error('Network error: Unable to reach server');
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate preview: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json().catch(err => {
        console.error('JSON parse error:', err);
        throw new Error('Invalid response format from server');
      });

      setPreviewData(data);
    } catch (err) {
      console.error('Preview generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoicePreview = async () => {
    if (!previewData?.reminder) return;

    setIsPlayingVoice(true);

    try {
      const response = await fetch('/api/test-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewData.reminder.rudeMessage,
          voiceId: previewData.reminder.voiceCharacter,
        }),
      }).catch(err => {
        console.error('Voice API network error:', err);
        throw new Error('Network error');
      });

      if (response.ok) {
        const audioBlob = await response.blob().catch(err => {
          console.error('Audio blob error:', err);
          throw new Error('Audio processing error');
        });

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsPlayingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (err) => {
          console.error('Audio playback error:', err);
          setIsPlayingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play().catch(err => {
          console.error('Audio play error:', err);
          throw new Error('Audio playback failed');
        });
      } else {
        console.warn('Voice API failed, using fallback');
        throw new Error('Voice API failed');
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      setIsPlayingVoice(false);

      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(previewData.reminder.rudeMessage);
          utterance.onend = () => setIsPlayingVoice(false);
          utterance.onerror = (err) => {
            console.error('Speech synthesis error:', err);
            setIsPlayingVoice(false);
          };
          speechSynthesis.speak(utterance);
        } catch (fallbackError) {
          console.error('Fallback speech error:', fallbackError);
          setIsPlayingVoice(false);
        }
      } else {
        console.error('No speech synthesis available');
        setIsPlayingVoice(false);
      }
    }
  };