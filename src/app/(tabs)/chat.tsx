import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

type Message = {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
};

export default function Chat() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [clanId, setClanId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    const { data: mine } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!mine) {
      setClanId(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setClanId(mine.clan_id);

    const { data: ms } = await supabase
      .from('clan_members')
      .select('user_id, profiles(username, full_name)')
      .eq('clan_id', mine.clan_id);

    const map: Record<string, string> = {};

    (ms ?? []).forEach((m: any) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      map[m.user_id] = p?.full_name || p?.username || 'Roomie';
    });

    setNames(map);

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('id, user_id, content, created_at')
      .eq('clan_id', mine.clan_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setMessages((msgs ?? []) as Message[]);
    }

    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!clanId) {
      return;
    }

    const channel = supabase
      .channel('clan-chat-' + clanId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'clan_id=eq.' + clanId,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) {
              return prev;
            }
            return [m, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clanId]);

  async function send() {
    if (!session || !clanId) {
      return;
    }

    const content = text.replace(/^\s+|\s+$/g, '');

    if (content.length === 0) {
      return;
    }

    setSending(true);

    const { error } = await supabase.from('messages').insert({
      clan_id: clanId,
      user_id: session.user.id,
      content: content,
    });

    setSending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setText('');
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!clanId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.empty}>
          Únete a un clan o crea uno para chatear con tus roomies.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Text style={styles.title}>Chat del clan</Text>
      <Pressable onPress={() => router.push('/clan-chats' as any)}>
        <Text style={styles.link}>Chats con otros clanes →</Text>
      </Pressable>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { transform: [{ scaleY: -1 }] }]}>
            Aún no hay mensajes. ¡Rompe el hielo!
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.user_id === session?.user.id;

          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {!mine && (
                <Text style={styles.author}>{names[item.user_id] ?? 'Roomie'}</Text>
              )}
              <Text style={styles.msg}>{item.content}</Text>
              <Text style={styles.time}>{formatTime(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje"
          placeholderTextColor="#888"
          maxLength={2000}
          multiline
        />
        <Pressable style={styles.send} onPress={send} disabled={sending}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 16 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
    link: { color: '#3b82f6', marginTop: 4 },
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  empty: { color: '#888', textAlign: 'center', marginTop: 24 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 14, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#1d4ed8' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#1f1f1f' },
  author: { color: '#93c5fd', fontSize: 12, fontWeight: '600' },
  msg: { color: '#fff', fontSize: 16 },
  time: { color: '#bbb', fontSize: 11, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 12 },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#111',
  },
  send: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});