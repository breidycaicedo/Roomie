import { StyleSheet, Text, View } from 'react-native';

export default function MiClan() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi clan</Text>
      <Text style={styles.text}>Aquí va tu casa, tus roomies y el chat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  text: { color: '#aaa', marginTop: 8, textAlign: 'center' },
});