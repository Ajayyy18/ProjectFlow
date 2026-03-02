import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const TeamChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [team, setTeam] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTeamDetails();
    const setupMessagesSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Get user's team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .contains('members', [user.id])
        .single();

      if (teamData) {
        setTeam(teamData);
        
        // Subscribe to new messages
        const subscription = supabase
          .channel('team-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `team_id=eq.${teamData.id}`
            },
            (payload) => {
              setMessages(current => [...current, payload.new]);
            }
          )
          .subscribe();

        // Fetch existing messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            *,
            profiles:user_id (full_name)
          `)
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: true });

        setMessages(messagesData || []);
        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      }
    };

    setupMessagesSubscription();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchTeamDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .contains('members', [user.id])
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);
    } catch (error) {
      console.error('Error fetching team details:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !team) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          team_id: team.id,
          user_id: currentUser.id,
          content: newMessage.trim(),
          created_at: new Date()
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!team) {
    return (
      <div className="container">
        <p>You need to be part of a team to access the chat.</p>
      </div>
    );
  }

  return (
    <div className="container chat-container">
      <h1 className="card-title mb-4">Team Chat</h1>
      
      <div className="card chat-card">
        <div className="chat-messages">
          <div className="message-list">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.user_id === currentUser.id ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-content">
                  <p className="message-sender">
                    {message.profiles.full_name}
                  </p>
                  <p className="message-text">{message.content}</p>
                  <p className="message-time">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <form onSubmit={sendMessage} className="chat-input">
          <div className="input-group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="form-input"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="btn btn-primary"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamChat;
