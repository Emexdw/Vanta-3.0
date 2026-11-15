import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import PostCard from '../../src/components/PostCard';
type Post = { id: string; user_id: string; kind: 'post' | 'clip'; media_urls: string[]; poster_url: string | null; caption: string; likes_count: number; comments_count: number; created_at: string; author: { username: string; display_name: string; avatar_url: string } };
export default function FeedScreen() {
 const { session } = useAuth(); const [posts,setPosts]=useState<Post[]>([]); const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [error,setError]=useState('');
 const load=useCallback(async()=>{ if(!session?.user.id)return; const {data,error:queryError}=await supabase.from('posts').select('id,user_id,kind,media_urls,poster_url,caption,likes_count,comments_count,created_at,author:profiles!posts_user_id_fkey(username,display_name,avatar_url)').eq('kind','post').order('created_at',{ascending:false}).limit(30); if(queryError)setError('No se pudo cargar el feed. Verificá que el esquema SQL esté instalado.');else{setPosts((data||[]) as unknown as Post[]);setError('');}setLoading(false);setRefreshing(false); },[session?.user.id]);
 useEffect(()=>{load();},[load]);
 return <View style={s.root}><View style={s.top}><Text style={s.logo}>VANTA</Text><Text style={s.topSub}>TU MUNDO, TU MIRADA.</Text></View>{loading?<ActivityIndicator color="#c4b5fd" style={{marginTop:50}}/>:error?<Text style={s.empty}>{error}</Text>:<FlatList data={posts} keyExtractor={p=>p.id} renderItem={({item})=><PostCard post={item} meId={session!.user.id}/>} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#c4b5fd" onRefresh={()=>{setRefreshing(true);load();}}/>} ListEmptyComponent={<Text style={s.empty}>Todavía no hay publicaciones. ¡Podés ser de los primeros en compartir!</Text>} contentContainerStyle={{paddingBottom:25}}/>}</View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#09090b'},top:{height:64,borderBottomWidth:1,borderBottomColor:'#27272a',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:17},logo:{color:'#fafafa',fontSize:23,fontWeight:'900',letterSpacing:5},topSub:{color:'#71717a',fontSize:8,letterSpacing:2},empty:{color:'#a1a1aa',textAlign:'center',padding:30,lineHeight:22}});
