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
const isPreviewMode = ref(false);
const loading = ref(true);
const proposal = ref(null);
const documentBackground = ref('');
const pageSize = ref('A4'); // Default page size
const showGrid = ref(true); // Set to true by default to show the ruler

// Section management
const activeSection = ref('cover');
const sections = ref([
  {
    id: 'cover',
    name: 'Cover',
    documents: [
      { id: 'cover-doc-1', name: 'Cover Page', content: [] }
    ]
  }
]);
const activeDocument = ref('cover-doc-1');

const tools = [
  { icon: 'mdi-format-text', label: 'Text', color: '#2196F3', action: 'addText' },
  // { icon: 'mdi-image-outline', label: 'Image', color: '#4CAF50', action: 'addImage' },
  { icon: 'mdi-image-filter-hdr', label: 'Background', color: '#4CAF50', action: 'addBackground' },
  //{ icon: 'mdi-table', label: 'Table', color: '#FF9800', action: 'addTable' },
  { icon: 'mdi-shape-outline', label: 'Shape', color: '#9C27B0', action: 'addShape' },
  { icon: 'mdi-vector-line', label: 'Line', color: '#795548', action: 'addLine' },
  { icon: 'mdi-view-grid-outline', label: 'Grid', color: '#607D8B', action: 'addGrid' },
  //{ icon: 'mdi-currency-usd', label: 'Pricing', color: '#FF5722', action: 'addPricing' },
  //{ icon: 'mdi-signature-freehand', label: 'Signature', color: '#3F51B5', action: 'addSignature' },
  //{ icon: 'mdi-pencil', label: 'Draw', color: '#E91E63', action: 'addDraw' },
];

const handleToolClick = (tool) => {
  if (tool.action === 'addBackground') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          documentBackground.value = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  } else {
    activeTool.value = tool.action;
  }
};

const increaseZoom = () => {
  if (zoom.value < 200) zoom.value += 25;
};

const decreaseZoom = () => {
  if (zoom.value > 25) zoom.value -= 25;
};

const toggleGrid = () => {
  showGrid.value = !showGrid.value;
};

const togglePreview = () => {
  isPreviewMode.value = !isPreviewMode.value;
};

// Add a new document to a section
const addDocument = (sectionId) => {
  const section = sections.value.find(s => s.id === sectionId);
  if (!section) return;

  const newDocId = `${sectionId}-doc-${Date.now()}`; // Use timestamp for unique ID
  const newDocument = {
    id: newDocId,
    name: `Document ${section.documents.length + 1}`,
    content: []
  };

  section.documents.push(newDocument);

  // Set the new document as active
  activeDocument.value = newDocId;
  activeSection.value = sectionId;

  // Update the content to show the new document
  updateActiveContent();
};

// Delete a document from a section
const deleteDocument = (sectionId, documentId) => {
  const section = sections.value.find(s => s.id === sectionId);
  if (!section) return;

  // Don't allow deleting the last document
  if (section.documents.length <= 1) {
    alert('Cannot delete the last document in a section');
    return;
  }

  // Check if we're deleting the active document
  const isActiveDocument = activeDocument.value === documentId;

  // Find the document index
  const docIndex = section.documents.findIndex(d => d.id === documentId);
  if (docIndex === -1) return;

  // Remove the document
  section.documents.splice(docIndex, 1);

  // If we deleted the active document, switch to another one
  if (isActiveDocument) {
    // Find the next document, or the previous if there's no next
    const nextDocIndex = docIndex < section.documents.length ? docIndex : docIndex - 1;
    const nextDoc = section.documents[nextDocIndex];

    // Switch to the next document
    activeDocument.value = nextDoc.id;
    updateActiveContent();
  }

  // Rename documents to maintain sequential numbering
  section.documents.forEach((doc, index) => {
    // Only update the name if it follows the pattern "Document X"
    if (/^Document \d+$/.test(doc.name)) {
      doc.name = `Document ${index + 1}`;
    }
  });
};

// Switch to a different document
const switchDocument = (docId, sectionId) => {
  // Save current document content
  saveCurrentDocumentContent();

  // Update active document and section
  activeDocument.value = docId;
  activeSection.value = sectionId;

  // Load the selected document content
  updateActiveContent();
};

// Save the current document content
const saveCurrentDocumentContent = () => {
  if (!toolEditor.value) return;

  // Find the current active document
  const section = sections.value.find(s => s.id === activeSection.value);
  if (!section) return;

  const document = section.documents.find(d => d.id === activeDocument.value);
  if (!document) {
    // If the active document doesn't exist (might have been deleted),
    // and there are other documents, switch to the first one
    if (section.documents.length > 0) {
      activeDocument.value = section.documents[0].id;
      updateActiveContent();
    }
    return;
  }

  // Save the content from the editor to the document
  document.content = content.value;
};

// Update the editor content based on the active document
const updateActiveContent = () => {
  const section = sections.value.find(s => s.id === activeSection.value);
  if (!section) return;

  const document = section.documents.find(d => d.id === activeDocument.value);
  if (!document) return;

  // Update the editor content
  content.value = document.content;
};

const saveContent = async () => {
  try {
    if (!proposalId) {
      console.error('Proposal ID is missing');
      return;
    }

    // Save the current document content
    saveCurrentDocumentContent();

    // Collect all content from all documents in the cover section
    const allContent = [];
    const coverSection = sections.value[0]; // We only have the cover section now

    coverSection.documents.forEach(doc => {
      // Add section and document metadata to each block
      const docContent = doc.content.map(block => ({
        ...block,
        sectionId: 'cover',
        documentId: doc.id
      }));
      allContent.push(...docContent);
    });

    // Call the updateProposal API with all the content
    await store.dispatch('updateProposal', {
      id: proposalId,
      content: JSON.stringify(allContent),
      background: documentBackground.value,
      pageSize: pageSize.value
    });

    console.log('Saved proposal with background');
    router.push('/');
  } catch (error) {
    console.error('Error saving content:', error);
  }
};

onMounted(async () => {
  if (proposalId) {
    try {
      loading.value = true;
      const fetchedProposal = await store.dispatch('getProposal', proposalId);
      proposal.value = fetchedProposal;

      // Load background if it exists
      if (fetchedProposal.background) {
        documentBackground.value = fetchedProposal.background;
      }

      // Load page size if it exists
      if (fetchedProposal.pageSize) {
        pageSize.value = fetchedProposal.pageSize;
      }

      // If there's content, parse it and distribute to sections/documents
      if (fetchedProposal.content) {
        try {
          const parsedContent = JSON.parse(fetchedProposal.content);

          // Group content by section and document
          const contentBySection = {};

          parsedContent.forEach(block => {
            const sectionId = block.sectionId || 'cover';
            const documentId = block.documentId || `${sectionId}-doc-1`;

            if (!contentBySection[sectionId]) {
              contentBySection[sectionId] = {};
            }

            if (!contentBySection[sectionId][documentId]) {
              contentBySection[sectionId][documentId] = [];
            }

            // Add the block to the appropriate document
            contentBySection[sectionId][documentId].push(block);
          });

          // Create sections and documents based on the content
          // We'll only keep the 'cover' section
          const coverSection = {
            id: 'cover',
            name: 'Cover',
            documents: []
          };

          // Process all documents from all sections
          Object.entries(contentBySection).forEach(([sectionId, documents]) => {
            // For each document in each section
            Object.entries(documents).forEach(([documentId, docContent]) => {
              // If it's from the cover section, keep the original document ID
              // Otherwise, create a new document ID in the cover section
              const newDocId = sectionId === 'cover' ?
                documentId :
                `cover-doc-${coverSection.documents.length + 1}`;

              // Create a document name based on the original section
              let docName = `Document ${coverSection.documents.length + 1}`;
              if (sectionId !== 'cover') {
                docName = `${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} ${coverSection.documents.length + 1}`;
              }

              // Add the document to the cover section
              coverSection.documents.push({
                id: newDocId,
                name: docName,
                content: docContent
              });
            });
          });

          // If we found any documents, update the sections
          if (coverSection.documents.length > 0) {
            sections.value = [coverSection];
          }

          // Set initial active section and document
          if (sections.value.length > 0) {
            const firstSection = sections.value[0];
            activeSection.value = firstSection.id;

            if (firstSection.documents.length > 0) {
              activeDocument.value = firstSection.documents[0].id;
              content.value = firstSection.documents[0].content;
            }
          }
        } catch (e) {
          console.error('Error parsing proposal content:', e);
          content.value = [];

          // Initialize with default content
          updateActiveContent();
        }
      } else {
        // Initialize with default content
        updateActiveContent();
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      loading.value = false;
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

      <!-- Add proposal title -->
      <v-toolbar-title class="text-subtitle-1">
        {{ proposal?.title || 'Loading...' }}
      </v-toolbar-title>

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
      <v-btn icon size="small" :color="showGrid ? 'primary' : 'grey-darken-1'" class="mr-2" @click="toggleGrid">
        <v-icon size="small">mdi-view-grid-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ showGrid ? 'Hide Grid' : 'Show Grid' }}</v-tooltip>
      </v-btn>
      <v-btn icon size="small" color="grey-darken-1">
        <v-icon size="small">mdi-fullscreen</v-icon>
      </v-btn>
      <v-spacer></v-spacer>

      <!-- Toggle between Preview and Edit modes -->
      <v-btn
        :color="isPreviewMode ? 'primary' : 'grey'"
        class="text-none mr-2"
        size="small"
        @click="togglePreview"
      >
        <v-icon start size="small">{{ isPreviewMode ? 'mdi-pencil' : 'mdi-eye' }}</v-icon>
        {{ isPreviewMode ? 'Edit' : 'Preview' }}
      </v-btn>

      <v-btn color="success" class="text-none mr-2" size="small" @click="saveContent">
        <v-icon start size="small">mdi-content-save</v-icon>
        Save
      </v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <!-- Show loading state -->
      <v-container v-if="loading" class="d-flex align-center justify-center" style="height: 100%">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-container>

      <!-- Show editor when data is loaded -->
      <v-container v-else fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <v-col v-if="!isPreviewMode" cols="2" class="bg-white section-sidebar">
            <v-list density="compact" class="pa-0">
              <v-list-subheader class="text-grey-darken-1 font-weight-bold">DOCUMENTS</v-list-subheader>

              <!-- Loop through sections -->
              <div v-for="section in sections" :key="section.id" class="section-container">
                <!-- Section header -->
                <div class="section-header">
                  <v-list-item
                    :prepend-icon="section.id === 'cover' ? 'mdi-file-document-outline' : 'mdi-file-document-outline'"
                    :title="section.name"
                    :value="section.id"
                    class="rounded-0 section-title"
                    :class="{ 'active-section': activeSection === section.id }"
                    active-color="primary"
                    @click="activeSection = section.id"
                  ></v-list-item>

                  <!-- Add document button -->
                  <v-btn
                    icon
                    size="x-small"
                    class="add-document-btn"
                    @click="addDocument(section.id)"
                    title="Add new document"
                  >
                    <v-icon size="small">mdi-plus</v-icon>
                  </v-btn>
                </div>

                <!-- Documents under this section -->
                <div class="documents-list" v-if="section.documents.length > 0">
                  <v-list-item
                    v-for="doc in section.documents"
                    :key="doc.id"
                    :title="doc.name"
                    :value="doc.id"
                    class="document-item ml-4"
                    :class="{ 'active-document': activeDocument === doc.id }"
                    active-color="primary"
                    density="compact"
                    @click="switchDocument(doc.id, section.id)"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-file-outline</v-icon>
                    </template>

                    <!-- Delete document button - only show if there's more than one document -->
                    <template v-slot:append v-if="section.documents.length > 1">
                      <v-btn
                        icon
                        size="x-small"
                        class="delete-document-btn"
                        @click.stop="deleteDocument(section.id, doc.id)"
                        title="Delete document"
                      >
                        <v-icon size="small">mdi-close</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </div>
              </div>
            </v-list>
          </v-col>

          <v-col :cols="isPreviewMode ? 12 : undefined" class="pa-4 d-flex editor-container">
            <div class="editor-outer-wrapper">
              <ToolEditor
                ref="toolEditor"
                v-model="content"
                :zoom="zoom"
                :action="activeTool"
                :readonly="isPreviewMode"
                :background="documentBackground"
                :showGrid="showGrid"
                :pageSize="pageSize"
                @update:pageSize="pageSize = $event"
                @update:modelValue="saveCurrentDocumentContent"
              />
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

.section-container {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  position: relative;
}

.section-title {
  flex-grow: 1;
}

.add-document-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  opacity: 0;
  transition: opacity 0.2s;
}

.section-header:hover .add-document-btn {
  opacity: 1;
}

.documents-list {
  margin-top: 2px;
}

.document-item {
  border-left: 2px solid #e0e0e0;
  transition: all 0.2s;
  position: relative;
}

.document-item:hover {
  background-color: #f5f5f5;
}

.delete-document-btn {
  opacity: 0;
  transition: opacity 0.2s;
  background-color: #f5f5f5;
}

.document-item:hover .delete-document-btn {
  opacity: 1;
}

.delete-document-btn:hover {
  background-color: #ffebee; /* Light red background on hover */
  color: #f44336; /* Red text on hover */
}

.active-section {
  background-color: #e3f2fd;
}

.active-document {
  background-color: #e8f5e9;
  border-left: 2px solid #4caf50;
}

.editor-container {
  position: relative;
  overflow: auto;
  /* Changed from hidden to auto to allow scrolling */
  z-index: 1;
  /* Lower z-index than sidebar */
}

.editor-outer-wrapper {
  flex: 1;
  position: relative;
  min-height: 100%;
  overflow: hidden;
}

.editor-content-wrapper {
  position: relative;
  z-index: 1;
  min-height: 100%;
  background-color: rgba(255, 255, 255, 0.9); /* Add slight transparency to see background */
  padding: 20px;
}

/* If you want to add a semi-transparent overlay to ensure text readability */
.editor-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7); /* Adjust opacity as needed */
  pointer-events: none; /* Allows clicking through to the editor */
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
