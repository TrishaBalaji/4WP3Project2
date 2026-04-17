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

  async function fetchData() {
    try {
      setMessage('Fetching data...');
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: Inspiration[] = await response.json();
      setInspirations(data);
      setMessage(`Loaded ${data.length} item(s).`);
      console.log('GET success:', data);
    } catch (error: any) {
      console.log('GET error:', error);
      setMessage(`Fetch failed: ${error?.message || 'Unknown error'}`);
      Alert.alert('Error', `Could not fetch data from API.\n\n${error?.message || 'Unknown error'}`); 
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

   async function createItem() {
    try {
      if (!summary || !explanation || !priority) {
        Alert.alert('Missing fields', 'Please enter summary, explanation, and priority.');
        return;
      }

      const parsedPriority = parseInt(priority, 10);
      if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
        Alert.alert('Invalid priority', 'Priority must be a number from 1 to 10.');
        return;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          explanation,
          priority: parsedPriority
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setMessage('Created successfully.');
      clearForm();
      fetchData();
    } catch (error: any) {
      console.log('POST error:', error);
      setMessage(`Create failed: ${error?.message || 'Unknown error'}`);
      Alert.alert('Error', `Could not create item.\n\n${error?.message || 'Unknown error'}`);
    }
  }

  async function updateItem() {
    try {
      if (!selectedId) {
        Alert.alert('Missing ID', 'Enter an ID to update.');
        return;
      }

      const body: any = {};
      if (summary) body.summary = summary;
      if (explanation) body.explanation = explanation;
      if (priority) {
        const parsedPriority = parseInt(priority, 10);
        if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
          Alert.alert('Invalid priority', 'Priority must be a number from 1 to 10.');
          return;
        }
        body.priority = parsedPriority;
      }

      if (Object.keys(body).length === 0) {
        Alert.alert('No fields', 'Enter at least one field to update.');
        return;
      }

      const response = await fetch(`${API_URL}/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setMessage(`Updated item ${selectedId}.`);
      clearForm();
      fetchData();
    } catch (error: any) {
      console.log('PUT error:', error);
      setMessage(`Update failed: ${error?.message || 'Unknown error'}`);
      Alert.alert('Error', `Could not update item.\n\n${error?.message || 'Unknown error'}`);
    }
  }

  async function deleteItem() {
    try {
      if (!selectedId) {
        Alert.alert('Missing ID', 'Enter an ID to delete.');
        return;
      }

      const response = await fetch(`${API_URL}/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setMessage(`Deleted item ${selectedId}.`);
      clearForm();
      fetchData();
    } catch (error: any) {
      console.log('DELETE error:', error);
      setMessage(`Delete failed: ${error?.message || 'Unknown error'}`);
      Alert.alert('Error', `Could not delete item.\n\n${error?.message || 'Unknown error'}`);
    }
  }

  async function deleteAllItems() {
    try {
      const response = await fetch(API_URL, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setMessage('Deleted all items.');
      clearForm();
      fetchData();
    } catch (error: any) {
      console.log('DELETE ALL error:', error);
      setMessage(`Delete all failed: ${error?.message || 'Unknown error'}`);
      Alert.alert('Error', `Could not delete all items.\n\n${error?.message || 'Unknown error'}`);
    }
  }
  
   function clearForm() {
    setSelectedId('');
    setSummary('');
    setExplanation('');
    setPriority('');
  }
  function loadIntoForm(item: Inspiration) {
    setSelectedId(String(item.id));
    setSummary(item.summary);
    setExplanation(item.explanation);
    setPriority(String(item.priority));
    setMessage(`Loaded item ${item.id} into form.`);
  }
 
return (
    <View style={styles.container}>
      <Text style={styles.title}>Art Inspirations</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.listSection}>
        <FlatList
          data={inspirations}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No inspirations found.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => loadIntoForm(item)}>
              <Text style={styles.cardTitle}>ID: {item.id} | {item.summary}</Text>
              <Text style={styles.cardText}>{item.explanation}</Text>
              <Text style={styles.cardText}>Priority: {item.priority}</Text>
              <Text style={styles.tapHint}>Tap to load into form</Text>
            </Pressable>
          )}
        />
      </View>

      <ScrollView style={styles.formSection}>
        <View style={styles.field}>
          <Text style={styles.label}>ID:</Text>
          <TextInput
            style={styles.input}
            placeholder="ID for update/delete"
            value={selectedId}
            onChangeText={setSelectedId}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Summary:</Text>
          <TextInput
            style={styles.input}
            placeholder="Summary"
            value={summary}
            onChangeText={setSummary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Explanation:</Text>
          <TextInput
            style={[styles.input, styles.largeInput]}
            placeholder="Explanation"
            value={explanation}
            onChangeText={setExplanation}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Priority:</Text>
          <TextInput
            style={styles.input}
            placeholder="Priority (1-10)"
            value={priority}
            onChangeText={setPriority}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.green]} onPress={createItem}> 
            <Text style={styles.buttonText}>Create</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.blue]} onPress={updateItem}>
            <Text style={styles.buttonText}>Update</Text>
          </Pressable>
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.red]} onPress={deleteItem}>
            <Text style={styles.buttonText}>Delete</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.darkRed]} onPress={deleteAllItems}>
            <Text style={styles.buttonText}>Delete All</Text>
          </Pressable>
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.gray]} onPress={clearForm}>
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  },
  formSection: {
    flex: 3,
    backgroundColor: '#fbe9fc',
    padding: 12,
  },
  field: {
    marginBottom: 10
  },
   label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  card: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  cardText: {
    fontSize: 15,
    marginTop: 4
  },
  tapHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#666'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16
  },
  input: {
    borderWidth: 2,
    borderColor: '#aaa',
    backgroundColor: 'white',
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 10
  },
  largeInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  button: {
    minWidth: 130,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  green: { backgroundColor: '#c1edbc' },
  blue: { backgroundColor: '#c7dcff' },
  red: { backgroundColor: '#ffd1d1' },
  darkRed: { backgroundColor: '#ffb3b3' },
  peach: { backgroundColor: '#FEEBE7' },
  gray: { backgroundColor: '#ddd' }
});
  
