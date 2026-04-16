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
  
