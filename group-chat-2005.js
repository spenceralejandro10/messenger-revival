(()=>{
function purgeLegacyGroupUi(){
  for(const selector of [
    '#directGroupsBtn',
    '.direct-groups-button',
    '#groupsToolbarButton',
    '.groups-toolbar-button',
    '#groupListDialog',
    '#groupNameDialog',
    '#groupInviteDialog',
    '#groupChatWindow'
  ]){
    document.querySelectorAll(selector).forEach(node=>node.remove());
  }
}
purgeLegacyGroupUi();
const root=document.body||document.documentElement;
if(root){
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(!record.addedNodes?.length)continue;
      for(const node of record.addedNodes){
        if(!(node instanceof Element))continue;
        if(node.matches?.('#directGroupsBtn,.direct-groups-button,#groupsToolbarButton,.groups-toolbar-button,#groupListDialog,#groupNameDialog,#groupInviteDialog,#groupChatWindow')||
           node.querySelector?.('#directGroupsBtn,.direct-groups-button,#groupsToolbarButton,.groups-toolbar-button,#groupListDialog,#groupNameDialog,#groupInviteDialog,#groupChatWindow')){
          purgeLegacyGroupUi();
          return;
        }
      }
    }
  });
  observer.observe(root,{childList:true,subtree:true});
  window.__legacyGroupCleanupObserver=observer;
}
window.MessengerGroupChat={
  openGroup:id=>window.MessengerConversationRoom?.openRoom?.(id),
  openList:()=>window.MessengerConversationRoom?.participants?.(),
  openCommonGroups:()=>window.MessengerConversationRoom?.participants?.(),
  poll:()=>Promise.resolve([])
};
})();