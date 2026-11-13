import { StyleSheet, Text, View } from 'react-native';

export default function Explorar() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explorar</Text>
      <Text style={styles.text}>Aquí van los clanes y cuartos disponibles.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  text: { color: '#aaa', marginTop: 8, textAlign: 'center' },
});