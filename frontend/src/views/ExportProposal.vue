<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import ToolEditor from '../components/tool_editor.vue';
import html2pdf from 'html2pdf.js';

const route = useRoute();
const router = useRouter();
const store = useStore();
const toolEditor = ref(null);
const content = ref(null);
const loading = ref(true);
const proposal = ref(null);
const error = ref(null);
const exportStatus = ref('loading'); // 'loading', 'success', 'error'

// Function to wait for editors to initialize
const waitForEditors = async () => {
  // Wait for a longer time to ensure all editors are initialized
  console.log('Waiting for editors to initialize...');
  return new Promise(resolve => setTimeout(resolve, 5000));
};

// Function to ensure content is properly loaded
const ensureContentLoaded = async () => {
  if (!content.value || content.value.length === 0) {
    console.warn('Content is empty, creating a sample block');
    // Create a sample block if content is empty
    content.value = [{
      id: Date.now(),
      x: 50,
      y: 50,
      width: 400,
      height: 200,
      content: {
        blocks: [{
          type: 'header',
          data: {
            text: proposal.value?.title || 'Sample Proposal',
            level: 2
          }
        }, {
          type: 'paragraph',
          data: {
            text: 'This is a sample proposal content. The actual content could not be loaded.'
          }
        }]
      },
      backgroundColor: 'transparent',
      zIndex: 10
    }];
  }
};

// Function to export PDF
const generatePDF = async () => {
  try {
    if (!toolEditor.value) {
      throw new Error('ToolEditor ref is not available');
    }

    console.log('Starting PDF export...');

    // Check if the editor has content
    if (!content.value || content.value.length === 0) {
      console.warn('Content is still empty before PDF generation');
      await ensureContentLoaded();
      await nextTick();
    }

    // Create a filename with sanitized title
    const sanitizedTitle = (proposal.value?.title || 'proposal')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filename = `${sanitizedTitle}.pdf`;

    // Try the direct method first using the tool editor's exportToPDF method
    try {
      console.log('Using tool editor exportToPDF method...');
      const result = await toolEditor.value.exportToPDF(proposal.value?.title || 'proposal');

      if (result) {
        exportStatus.value = 'success';
        console.log('PDF export completed successfully');

        // Wait a bit before redirecting
        setTimeout(() => {
          router.push('/');
        }, 2000);

        return true;
      } else {
        throw new Error('Tool editor PDF generation returned false');
      }
    } catch (toolEditorError) {
      console.error('Tool editor PDF generation failed:', toolEditorError);

      // Fall back to direct capture method
      console.log('Falling back to direct capture method...');

      // Find the editor container element
      const editorContainer = document.querySelector('.tool-editor-container');
      if (!editorContainer) {
        throw new Error('Editor container element not found in DOM');
      }

      // Find the document page element which contains the actual content
      const documentPage = editorContainer.querySelector('.document-page');
      const editorElement = documentPage || editorContainer.querySelector('.editor-container');

      // Use the element we found, or fall back to the container
      const elementToCapture = editorElement || editorContainer;

      // Get the page size
      const pageSize = proposal.value?.pageSize?.toUpperCase() || 'A4';

      // Render to canvas first for better quality
      const canvas = await html2pdf()
        .from(elementToCapture)
        .set({
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 3, // Higher scale for better quality
            useCORS: true,
            logging: true,
            allowTaint: true,
            backgroundColor: 'white',
            letterRendering: true
          },
          jsPDF: {
            unit: 'mm',
            format: pageSize,
            orientation: 'portrait'
          }
        })
        .toCanvas();

      console.log('Canvas generated successfully');

      // Now generate PDF from the canvas
      await html2pdf()
        .from(canvas)
        .set({
          margin: 0,
          filename: filename,
          jsPDF: {
            unit: 'mm',
            format: pageSize,
            orientation: 'portrait'
          }
        })
        .save();

      exportStatus.value = 'success';
      console.log('PDF export completed successfully using direct capture');

      // Wait a bit before redirecting
      setTimeout(() => {
        router.push('/');
      }, 2000);

      return true;
    }
  } catch (err) {
    console.error('PDF generation failed:', err);
    error.value = err.message || 'Failed to generate PDF';
    exportStatus.value = 'error';

    // Wait a bit before redirecting on error
    setTimeout(() => {
      router.push('/');
    }, 3000);

    return false;
  }
};

onMounted(async () => {
  const proposalId = route.params.id;

  try {
    // Fetch proposal data
    const fetchedProposal = await store.dispatch('getProposal', proposalId);
    proposal.value = fetchedProposal;

    if (!fetchedProposal) {
      throw new Error('Proposal not found');
    }

    // Parse the content if it exists
    if (fetchedProposal.content) {
      try {
        // Check if content is already an object (already parsed)
        if (typeof fetchedProposal.content === 'object') {
          content.value = fetchedProposal.content;
        } else {
          content.value = JSON.parse(fetchedProposal.content);
        }
        console.log('Parsed content:', content.value);

        // Validate content structure
        if (!Array.isArray(content.value)) {
          console.error('Content is not an array, resetting to empty array');
          content.value = [];
        }
      } catch (e) {
        console.error('Error parsing content:', e);
        content.value = [];
      }
    } else {
      console.warn('No content found in proposal');
      content.value = [];
    }

    // Ensure we have some content to render
    await ensureContentLoaded();

    // Wait for DOM to update
    await nextTick();

    // Wait for editors to initialize
    await waitForEditors();

    // Force another DOM update to ensure content is rendered
    await nextTick();

    // Generate PDF
    await generatePDF();
  } catch (err) {
    console.error('Export failed:', err);
    error.value = err.message || 'Export failed';
    exportStatus.value = 'error';

    // Wait a bit before redirecting on error
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="d-flex align-center justify-center" style="height: 100vh">
        <div class="text-center">
          <!-- Loading state -->
          <div v-if="exportStatus === 'loading'">
            <v-progress-circular
              indeterminate
              color="primary"
              size="64"
            ></v-progress-circular>
            <div class="mt-4 text-h6">Generating PDF...</div>
            <div class="text-subtitle-1 text-grey">Please wait, this may take a moment</div>
          </div>

          <!-- Success state -->
          <div v-else-if="exportStatus === 'success'">
            <v-icon size="64" color="success">mdi-check-circle</v-icon>
            <div class="mt-4 text-h6">PDF Generated Successfully</div>
            <div class="text-subtitle-1">Your download should begin automatically</div>
          </div>

          <!-- Error state -->
          <div v-else-if="exportStatus === 'error'">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <div class="mt-4 text-h6">Export Failed</div>
            <div class="text-subtitle-1 text-grey">{{ error || 'An error occurred during PDF generation' }}</div>
            <v-btn color="primary" class="mt-4" @click="router.push('/')">
              Return to Dashboard
            </v-btn>
          </div>
        </div>
      </v-container>

      <!-- ToolEditor for PDF generation - temporarily visible for debugging -->
      <div class="tool-editor-container">
        <ToolEditor
          ref="toolEditor"
          v-if="content"
          :modelValue="content"
          :readonly="true"
          :zoom="100"
          :background="proposal?.background"
          :pageSize="proposal?.pageSize || 'A4'"
        />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-main {
  background: white;
}

.tool-editor-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; /* Below the status messages */
  opacity: 0; /* Hidden but still rendered for PDF generation */
  pointer-events: none; /* Don't interfere with UI */
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 20px;
}

.export-container {
  max-width: none !important;
  height: 100%;
}

.export-editor {
  height: 100%;
}
</style>







