import { router, useLocalSearchParams } from 'expo-router';
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

type Msg = {
  id: number;
  user_id: string;
  clan_id: string;
  content: string;
  created_at: string;
};

export default function ClanChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [clanNames, setClanNames] = useState<Record<string, string>>({});
  const [myClanId, setMyClanId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function ensureName(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setNames((prev) => ({ ...prev, [userId]: data.full_name || data.username }));
    }
  }

  const load = useCallback(async () => {
    if (!session || !id) {
      return;
    }

    const { data: chat, error } = await supabase
      .from('clan_chats')
      .select('clan_a, clan_b')
      .eq('id', id)
      .maybeSingle();

    if (error || !chat) {
      Alert.alert('Error', 'No se encontró ese chat.');
      router.back();
      return;
    }

    const { data: cl } = await supabase
      .from('clans')
      .select('id, name')
      .in('id', [chat.clan_a, chat.clan_b]);

    const cmap: Record<string, string> = {};

    (cl ?? []).forEach((c: any) => {
      cmap[c.id] = c.name;
    });

    setClanNames(cmap);

    const { data: mine } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const myId = mine ? mine.clan_id : null;
    setMyClanId(myId);

    const otherId = myId === chat.clan_a ? chat.clan_b : chat.clan_a;
    setOtherName(cmap[otherId] ?? 'Clan');

    const { data: msgs, error: msgError } = await supabase
      .from('clan_chat_messages')
      .select('id, user_id, clan_id, content, created_at, profiles(username, full_name)')
      .eq('chat_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (msgError) {
      Alert.alert('Error', msgError.message);
    } else {
      const nmap: Record<string, string> = {};
      const list: Msg[] = [];

      (msgs ?? []).forEach((m: any) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        nmap[m.user_id] = p?.full_name || p?.username || 'Roomie';
        list.push({
          id: m.id,
          user_id: m.user_id,
          clan_id: m.clan_id,
          content: m.content,
          created_at: m.created_at,
        });
      });

      setNames(nmap);
      setMessages(list);
    }

    setLoading(false);
  }, [session, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id || !session) {
      return;
    }

    const me = session.user.id;

    const channel = supabase
      .channel('clan-x-chat-' + id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clan_chat_messages',
          filter: 'chat_id=eq.' + id,
        },
        (payload) => {
          const m = payload.new as Msg;

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) {
              return prev;
            }
            return [m, ...prev];
          });

          if (m.user_id !== me) {
            ensureName(m.user_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, session]);

  async function send() {
    if (!session || !id || !myClanId) {
      return;
    }

    const content = text.replace(/^\s+|\s+$/g, '');

    if (content.length === 0) {
      return;
    }

    setSending(true);

    const { error } = await supabase.from('clan_chat_messages').insert({
      chat_id: id,
      clan_id: myClanId,
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Text style={styles.title}>{otherName}</Text>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { transform: [{ scaleY: -1 }] }]}>
            Aún no hay mensajes. ¡Salúdalos!
          </Text>
        }
        renderItem={({ item }) => {
          const mineClan = item.clan_id === myClanId;
          const me = item.user_id === session?.user.id;
          const who = names[item.user_id] ?? 'Roomie';
          const label = mineClan ? who : who + ' · ' + (clanNames[item.clan_id] ?? 'Clan');

          return (
            <View style={[styles.bubble, mineClan ? styles.mine : styles.theirs]}>
              {!me && <Text style={styles.author}>{label}</Text>}
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
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 4 },
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