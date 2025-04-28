<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import DraggableResizableVue from 'draggable-resizable-vue3'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Quote from '@editorjs/quote'
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table'
import Image from '@editorjs/image'
import LinkTool from '@editorjs/link';
import Embed from '@editorjs/embed';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Warning from '@editorjs/warning';
import Underline from '@editorjs/underline';
import Paragraph from '@editorjs/paragraph'
import html2pdf from 'html2pdf.js';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  zoom: {
    type: Number,
    default: 100
  },
  action: {
    type: String,
    default: null
  },
  readonly: {
    type: Boolean,
    default: false
  },
  background: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);
const documentPage = ref(null);
const textBlocks = ref([]); // Move this declaration up
const editors = ref(new Map());
const isSelecting = ref(false);
const selectionArea = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});
const startX = ref(0);
const startY = ref(0);
const selectedBlockId = ref(null);

// Now add the watch after all refs are declared
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue.length > 0) {
    // Clear existing blocks
    textBlocks.value = [];

    // Create new blocks from the loaded content
    newValue.forEach(block => {
      const newBlock = {
        id: block.id,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        content: block.content
      };

      textBlocks.value.push(newBlock);

      // Create editor after Vue updates the DOM
      nextTick(() => {
        const editor = createEditor(newBlock.id);
        // Set the content for this editor
        if (editor) {
          editor.isReady.then(() => {
            editor.render(block.content);
          });
        }
      });
    });
  }
}, { immediate: true });

const createEditor = (blockId) => {
  const editor = new EditorJS({
    holder: `editor-${blockId}`,
    tools: {
      header: {
        class: Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3, 4, 5, 6],
          defaultLevel: 3
        }
      },
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
      },
      list: {
        class: List,
        inlineToolbar: true,
      },
      checklist: {
        class: Checklist,
        inlineToolbar: true,
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author',
        },
      },
      code: {
        class: Code,
      },
      delimiter: {
        class: Delimiter,
      },
      table: {
        class: Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3,
        },
      },
      image: {
        class: Image,
        config: {
          endpoints: {
            byFile: 'http://localhost:8080/uploadFile',
            byUrl: 'http://localhost:8080/fetchUrl',
          }
        }
      }
    },
    linkTool: {
      class: LinkTool,
      config: {
        endpoint: '/fetchUrl'
      }
    },
    embed: {
      class: Embed,
      config: {
        services: {
          youtube: true,
          twitter: true
        }
      }
    },
    marker: {
      class: Marker,
    },
    inlineCode: {
      class: InlineCode,
    },
    warning: {
      class: Warning,
      inlineToolbar: true
    },
    underline: {
      class: Underline,
    },
    data: {
      blocks: []
    },
    onChange: async () => {
      const content = await editor.save();
      updateBlockContent(blockId, content);
    }
  });

  editors.value.set(blockId, editor);
  return editor;
};

// Make sure to clean up editors when component is unmounted
onUnmounted(() => {
  editors.value.forEach(editor => {
    editor.destroy();
  });
  editors.value.clear();
});

const handleMouseDown = (e) => {
  if (props.action !== 'addText') return;

  const isTextBlock = e.target.closest('.text-block');
  if (isTextBlock) return;

  selectedBlockId.value = null;

  const rect = documentPage.value.getBoundingClientRect();
  isSelecting.value = true;
  startX.value = e.clientX - rect.left;
  startY.value = e.clientY - rect.top;

  selectionArea.value = {
    x: startX.value,
    y: startY.value,
    width: 0,
    height: 0,
  };
};

const handleMouseMove = (e) => {
  if (!isSelecting.value) return;

  const rect = documentPage.value.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  selectionArea.value = {
    x: Math.min(startX.value, currentX),
    y: Math.min(startY.value, currentY),
    width: Math.abs(currentX - startX.value),
    height: Math.abs(currentY - startY.value),
  };
};

const handleMouseUp = () => {
  if (!isSelecting.value) return;
  isSelecting.value = false;

  if (selectionArea.value.width < 10 || selectionArea.value.height < 10) {
    selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
    return;
  }

  const newBlock = {
    id: Date.now(),
    ...selectionArea.value,
    isActive: true,
    content: { blocks: [] },
  };

  textBlocks.value.push(newBlock);
  selectBlock(textBlocks.value[textBlocks.value.length - 1].id);
  selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };

  // Create editor after Vue updates the DOM
  nextTick(() => {
    createEditor(newBlock.id);
  });
};

const updateBlockContent = (id, content) => {
  const block = textBlocks.value.find(b => b.id === id);
  if (block) {
    block.content = content;
    emit('update:modelValue', textBlocks.value);
  }
};

const getAllBlocksContent = async () => {
  const blocksContent = [];
  for (const block of textBlocks.value) {
    const editor = editors.value.get(block.id);
    if (editor) {
      try {
        const content = await editor.save();
        blocksContent.push({
          id: block.id,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          content: content
        });
      } catch (error) {
        console.error('Error saving block content:', error);
      }
    }
  }
  return blocksContent;
};

const exportToPDF = async (proposalTitle = 'proposal') => {
  try {
    console.log('Starting PDF export...'); // Debug log

    // Create a container for the PDF content
    const element = document.createElement('div');
    // Set the container to A4 size in pixels (roughly 210mm x 297mm at 96 DPI)
    element.style.width = '795px';  // ~210mm
    element.style.height = '1125px'; // ~297mm
    element.style.position = 'relative';
    element.style.margin = '0';
    element.style.padding = '20px';

    // Add background if it exists
    if (props.background) {
      // Set background directly on the main container
      element.style.backgroundImage = `url(${props.background})`;
      element.style.backgroundSize = 'cover';
      element.style.backgroundPosition = 'center';
      element.style.backgroundRepeat = 'no-repeat';
    }

    // Create a semi-transparent overlay to make content more readable
    const overlayDiv = document.createElement('div');
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.right = '0';
    overlayDiv.style.bottom = '0';
    overlayDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    element.appendChild(overlayDiv);

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.zIndex = '2';
    contentDiv.style.padding = '20px';

    // Build the HTML content
    let htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #333;">${proposalTitle}</h1>
    `;

    // Process each block in the modelValue array
    for (const block of props.modelValue) {
      if (block.content && block.content.blocks) {
        for (const contentBlock of block.content.blocks) {
          switch (contentBlock.type) {
            case 'header':
              htmlContent += `<h${contentBlock.data.level || 2} style="margin: 15px 0; color: #333;">
                ${contentBlock.data.text}
              </h${contentBlock.data.level || 2}>`;
              break;

            case 'paragraph':
              htmlContent += `<p style="margin: 10px 0; line-height: 1.6;">
                ${contentBlock.data.text}
              </p>`;
              break;

            case 'list':
              const listType = contentBlock.data.style === 'ordered' ? 'ol' : 'ul';
              htmlContent += `<${listType} style="margin: 10px 0; padding-left: 20px;">
                ${contentBlock.data.items.map(item => `<li>${item}</li>`).join('')}
              </${listType}>`;
              break;

            case 'image':
              if (contentBlock.data.url) {
                htmlContent += `<img src="${contentBlock.data.url}" 
                  style="max-width: 100%; margin: 10px 0;" 
                  alt="${contentBlock.data.caption || ''}" />`;
              }
              break;
          }
        }
      }
    }

    htmlContent += '</div>';
    contentDiv.innerHTML = htmlContent;
    element.appendChild(contentDiv);

    // Add element to document temporarily
    document.body.appendChild(element);

    const opt = {
      margin: 0, // Remove margins
      filename: `${proposalTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: null,
        width: element.offsetWidth,
        height: element.offsetHeight
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    // Generate PDF
    try {
      await html2pdf()
        .from(element)
        .set(opt)
        .save();
      console.log('PDF generation completed');
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      throw pdfError;
    } finally {
      // Cleanup
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in exportToPDF:', error);
    throw error;
  }
};

// Make sure to expose the method
defineExpose({
  getAllBlocksContent,
  exportToPDF
});

const selectBlock = (id) => {
  selectedBlockId.value = id;
};

watch(() => props.action, (newAction) => {
  if (newAction === 'addText') {
    isSelecting.value = false;
    selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
  }
});
</script>

<template>
  <div class="editor-container" 
       ref="documentPage" 
       @mousedown="handleMouseDown" 
       @mousemove="handleMouseMove"
       @mouseup="handleMouseUp"
       :style="{
         backgroundImage: props.background ? `url(${props.background})` : 'none',
         backgroundSize: 'cover',
         backgroundPosition: 'center',
         backgroundRepeat: 'no-repeat'
       }"
  >
    <!-- Text Blocks -->
    <draggable-resizable-vue 
      v-for="block in textBlocks" 
      :key="block.id" 
      class="resizable-content"
      :class="{ 'text-block-selected': block.isActive }" 
      @mousedown.stop="selectBlock(block.id)" 
      v-model:x="block.x"
      v-model:y="block.y" 
      v-model:h="block.height" 
      v-model:w="block.width" 
      v-model:active="block.isActive"
      handles-type="borders"
    >
      <div class="text-block-content">
        <div :id="`editor-${block.id}`"></div>
      </div>
    </draggable-resizable-vue>

    <!-- Selection Area -->
    <div v-if="isSelecting" 
         class="selection-area" 
         :style="{
           left: `${selectionArea.x}px`,
           top: `${selectionArea.y}px`,
           width: `${selectionArea.width}px`,
           height: `${selectionArea.height}px`
         }"
    ></div>
  </div>
</template>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 800px;
  background: white;
  /* Add a semi-transparent overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    pointer-events: none;
  }
}

.resizable-content {
  position: relative; /* Change to relative */
  z-index: 1; /* Ensure blocks appear above the background */
  background: rgba(255, 255, 255, 0.9); /* Semi-transparent background */
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.text-block-content {
  height: 100%;
  padding: 10px;
}

.text-block-selected {
  border: 2px solid #2196F3;
  box-shadow: 0 0 0 1px #2196F3, 0 2px 4px rgba(0, 0, 0, 0.1);

  /* border: 2px solid #1976D2; */
}

.selection-area {
  position: absolute;
  border: 2px dashed #1976D2;
  background: rgba(25, 118, 210, 0.1);
  pointer-events: none;
}

.resizable-content {
  position: absolute;
  min-width: 100px;
  min-height: 100px;
  background-color: white;
  border: 1px solid #ddd;
  border: none !important;
  border-radius: 4px;
  /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); */
}

:deep(.codex-editor) {
  height: 100%;
}

:deep(.ce-block__content) {
  max-width: none;
  margin: 0;
}

:deep(.ce-toolbar__content) {
  max-width: none;
  margin: 0;
}
</style>
