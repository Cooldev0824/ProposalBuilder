<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import ToolEditor from '../components/tool_editor.vue';

const store = useStore();
const router = useRouter();
const route = useRoute();
const toolEditor = ref(null);
const zoom = ref(100);
const activeTool = ref(null);
const content = ref([]);
const proposalId = route.params.id;

const tools = [
  { icon: 'mdi-format-text', label: 'Text', color: '#2196F3', action: 'addText' },
  { icon: 'mdi-image-outline', label: 'Image', color: '#4CAF50', action: 'addImage' },
  { icon: 'mdi-table', label: 'Table', color: '#FF9800', action: 'addTable' },
  { icon: 'mdi-shape-outline', label: 'Shape', color: '#9C27B0', action: 'addShape' },
  { icon: 'mdi-vector-line', label: 'Line', color: '#795548', action: 'addLine' },
  { icon: 'mdi-view-grid-outline', label: 'Grid', color: '#607D8B', action: 'addGrid' },
  { icon: 'mdi-currency-usd', label: 'Pricing', color: '#FF5722', action: 'addPricing' },
  { icon: 'mdi-signature-freehand', label: 'Signature', color: '#3F51B5', action: 'addSignature' },
  { icon: 'mdi-pencil', label: 'Draw', color: '#E91E63', action: 'addDraw' },
];

const handleToolClick = (tool) => {
  activeTool.value = tool.action;
};

const increaseZoom = () => {
  if (zoom.value < 200) zoom.value += 25;
};

const decreaseZoom = () => {
  if (zoom.value > 25) zoom.value -= 25;
};

const saveContent = async () => {
  try {
    if (!proposalId) {
      console.error('Proposal ID is missing');
      return;
    }

    // Get all blocks content from the ToolEditor component
    const blocksContent = await toolEditor.value.getAllBlocksContent();
    
    // Call the updateProposal API with the blocks content
    const res = await store.dispatch('updateProposal', {
      id: proposalId,
      content: blocksContent,
    });

    console.log('Saved blocks:', blocksContent);
    router.push('/');
  } catch (error) {
    console.error('Error saving content:', error);
  }
};

onMounted(async () => {
  if (proposalId) {
    try {
      const proposal = await store.dispatch('getProposal', proposalId);
      if (proposal && proposal.content) {
        content.value = proposal.content;
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
    }
  }
});
</script>

<template>
  <v-app>
    <v-app-bar color="white" elevation="1" height="48">
      <v-btn icon class="mr-2" size="small" @click="$router.back()" color="grey-darken-1">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <v-spacer></v-spacer>
      <v-btn-group divided class="mr-2">
        <v-btn icon size="small" @click="decreaseZoom">
          <v-icon size="small" color="grey-darken-1">mdi-magnify-minus-outline</v-icon>
        </v-btn>
        <v-btn variant="text" size="small" class="px-3" color="grey-darken-1">
          {{ zoom }}%
        </v-btn>
        <v-btn icon size="small" @click="increaseZoom">
          <v-icon size="small" color="grey-darken-1">mdi-magnify-plus-outline</v-icon>
        </v-btn>
      </v-btn-group>
      <v-btn icon size="small" color="grey-darken-1" class="mr-2">
        <v-icon size="small">mdi-view-grid-outline</v-icon>
      </v-btn>
      <v-btn icon size="small" color="grey-darken-1">
        <v-icon size="small">mdi-fullscreen</v-icon>
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn color="primary" variant="text" size="small" class="text-none mr-2">
        <v-icon start size="small">mdi-eye</v-icon>
        Preview
      </v-btn>
      <v-btn color="success" class="text-none mr-2" size="small" @click="saveContent">
        <v-icon start size="small">mdi-content-save</v-icon>
        Save
      </v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <v-col cols="2" class="bg-white section-sidebar">
            <v-list density="compact" class="pa-0">
              <v-list-subheader class="text-grey-darken-1 font-weight-bold">SECTIONS</v-list-subheader>
              <v-list-item prepend-icon="mdi-file-document-outline" title="Cover" value="cover" class="rounded-0"
                active-color="primary"></v-list-item>
              <v-list-item prepend-icon="mdi-file-document-outline" title="Content" value="content" class="rounded-0"
                active-color="primary"></v-list-item>
            </v-list>
          </v-col>

          <v-col class="pa-4 d-flex editor-container">
            <div class="editor-wrapper">
              <ToolEditor ref="toolEditor" v-model="content" :zoom="zoom" :action="activeTool"/>
            </div>
            <div class="vertical-toolbar">
              <v-tooltip v-for="tool in tools" :key="tool.label" :text="tool.label" location="left">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    variant="text"
                    :color="tool.color"
                    class="tool-button"
                    :class="{ active: activeTool === tool.action }"
                    @click="handleToolClick(tool)"
                  >
                    <v-icon>{{ tool.icon }}</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
:root {
  --v-theme-primary: #1976D2;
  --v-theme-success: #4CAF50;
}

.v-btn-group .v-btn {
  background-color: white !important;
}

.v-list-item--active {
  background-color: #E3F2FD !important;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.section-sidebar {
  position: relative;
  z-index: 3;
  /* Increased z-index to stay on top */
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}

.editor-container {
  position: relative;
  overflow: auto;
  /* Changed from hidden to auto to allow scrolling */
  z-index: 1;
  /* Lower z-index than sidebar */
}

.editor-wrapper {
  flex: 1;
  padding: 20px;
  min-height: 100%;
}

.vertical-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: fit-content;
  position: sticky;
  top: 20px;
  margin-left: 16px;
  z-index: 3;
  /* Same z-index as sidebar to stay on top */
}

.tool-button {
  width: 40px;
  height: 40px;
}

.tool-button:hover {
  background-color: #f5f5f5;
}

.vertical-toolbar .tool-button.active {
  background-color: var(--v-theme-primary);
  color: white;
}
</style>
