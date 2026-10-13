import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, Chip, T } from '@/ui';
import { askBot, chatConfigured, type ChatMsg } from '@/chatApi';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What was my biggest expense last month?',
  'Compare this month with last month',
  'Where am I spending the most?',
];

export default function Chat() {
  const { c, symbol, budget } = useTheme();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const configured = chatConfigured();

  async function send(q?: string) {
    const content = (q ?? text).trim();
    if (!content || busy) return;
    const next: ChatMsg[] = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      const reply = await askBot(next, symbol, budget);
      setMsgs([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Something went wrong.'}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <View style={{ flex: 1, paddingTop: insets.top + 16 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <T size={28} weight="700">Ask</T>
          <T size={13} sub>Ask anything about your expenses.</T>
        </View>

        {!configured && (
          <Card style={{ marginHorizontal: 20, marginBottom: 8 }}>
            <T weight="600">Chatbot not connected</T>
            <T size={13} sub style={{ marginTop: 4 }}>
              Deploy the proxy in /worker and put its URL in app.json → expo.extra.chatProxyUrl. See README.
            </T>
          </Card>
        )}

        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ marginTop: 12 }}>
              <T size={12} sub style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Try asking</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  backgroundColor: mine ? c.accent : c.card,
                  borderWidth: mine ? 0 : 1,
                  borderColor: c.line,
                  borderRadius: 16,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <T style={{ color: mine ? c.accentText : c.text, lineHeight: 21 }}>{item.content}</T>
              </View>
            );
          }}
          ListFooterComponent={busy ? <ActivityIndicator style={{ alignSelf: 'flex-start', marginTop: 8 }} color={c.sub} /> : null}
          keyboardShouldPersistTaps="handled"
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask about your spending…"
            placeholderTextColor={c.sub}
            multiline
            style={{
              flex: 1, maxHeight: 110, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 20,
              paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: c.text,
            }}
          />
          <Pressable
            onPress={() => send()}
            disabled={busy || !text.trim()}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
              opacity: busy || !text.trim() ? 0.35 : 1,
            }}
          >
            <Ionicons name="arrow-up" size={22} color={c.accentText} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
