import { useEffect, useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { theme } from '../lib/theme';

// "Ouvir notícia" no Mobile — leitura em voz alta via expo-speech (API de áudio
// padrão da plataforma). pause/resume é só iOS no expo-speech, por isso o
// controlo é Ouvir/Parar (fiável em Android e iOS).

export function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  // Pára a leitura ao sair do ecrã.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const start = () => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: 'pt-PT',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const stop = () => {
    Speech.stop();
    setSpeaking(false);
  };

  return (
    <Pressable style={styles.btn} onPress={speaking ? stop : start}>
      <Text style={styles.txt}>{speaking ? '⏹ Parar' : '🔊 Ouvir'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  txt: { color: theme.text, fontWeight: '600', fontSize: 14 },
});
