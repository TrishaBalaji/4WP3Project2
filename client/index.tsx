import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';

type Inspiration = {
  id: number;
  summary: string;
  explanation: string;
  visual: string | null;
  priority: number;
};

const API_URL = 'http://localhost:3000/api';

export default function Index() {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState('');
  const [explanation, setExplanation] = useState('');
  const [priority, setPriority] = useState('');
  const [message, setMessage] = useState('App loaded.');

return (
    <View style={styles.container}>
      <Text style={styles.title}>Art Inspirations</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.listSection}>
        <Text style={styles.placeholderText}>Inspirations will appear here.</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.placeholderText}>Form controls coming next.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  message: {
    textAlign: 'center',
    color: 'red',
    marginVertical: 10,
    paddingHorizontal: 12
  },
  listSection: {
    flex: 4,
    backgroundColor: '#DFFFFF',
    padding: 10,
    justifyContent: 'center'
  },
  formSection: {
    flex: 3,
    backgroundColor: '#fbe9fc',
    padding: 12,
    justifyContent: 'center'
  },
  placeholderText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555'
  }
});
  
