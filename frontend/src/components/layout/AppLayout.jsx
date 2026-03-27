import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatPanel from '@components/chat/ChatPanel';
import { useSocket } from '@hooks/useSocket';
import { useChatStore } from '@store/chat.store';
import { useWorkspaceStore } from '@store/workspace.store';

export default function AppLayout() {
  const { socket, joinWorkspace, joinChannel, joinDM } = useSocket();
  const { addMessage, currentChannel, currentDMUser, fetchChannels, setCurrentChannel, setCurrentDMUser, resetChatContext } = useChatStore();
  const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();
  const params = useParams();
  const location = useLocation();

  // Get workspaceId from params or currentWorkspace
  const workspaceId = params.workspaceId || currentWorkspace?._id;

  // Ensure currentWorkspace is set when workspaceId is in params
  useEffect(() => {
    if (params.workspaceId && (!currentWorkspace || currentWorkspace._id !== params.workspaceId)) {
      fetchWorkspace(params.workspaceId).catch(console.error);
    }
  }, [params.workspaceId, currentWorkspace, fetchWorkspace]);

  useEffect(() => {
    if (!socket || !workspaceId) return;
    joinWorkspace(workspaceId);
  }, [socket, workspaceId, joinWorkspace]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchChannels(workspaceId).then((channels) => {
      const searchParams = new URLSearchParams(location.search);
      const chatType = searchParams.get('chatType');
      const channelId = searchParams.get('channelId');
      const participantId = searchParams.get('participantId');

      if (chatType === 'channel' && channelId) {
        const matchedChannel = channels.find((channel) => channel._id === channelId);
        if (matchedChannel) {
          setCurrentChannel(matchedChannel);
          return;
        }
      }

      if (chatType === 'direct' && participantId) {
        const matchedMember = (currentWorkspace?.members || []).find((member) => member.user?._id === participantId);
        if (matchedMember?.user) {
          setCurrentDMUser(matchedMember.user);
          return;
        }
      }

      if (channels.length) {
        const general = channels.find((c) => c.name === 'general') || channels[0];
        setCurrentChannel(general);
      }
    });
  }, [workspaceId, fetchChannels, setCurrentChannel, setCurrentDMUser, location.search, currentWorkspace]);

  useEffect(() => {
    if (!socket) return;
    if (currentChannel?._id) joinChannel(currentChannel._id);
    if (currentDMUser?._id) joinDM(currentDMUser._id);
  }, [socket, currentChannel, currentDMUser, joinChannel, joinDM]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => addMessage(msg);
    socket.on('receiveMessage', handleNewMessage);
    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [socket, addMessage]);

  useEffect(() => {
    return () => {
      resetChatContext();
    };
  }, [workspaceId, resetChatContext]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {currentWorkspace && <ChatPanel workspaceId={currentWorkspace._id} members={currentWorkspace.members} />}
    </div>
  );
}
