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
import EditorRuler from './editor_ruler.vue';

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
  showGrid: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);
const documentPage = ref(null);
const textBlocks = ref([]); // Move this declaration up
const editors = ref(new Map());
const isSelecting = ref(false);
const containerWidth = ref(0);
const containerHeight = ref(0);
const mousePosition = ref({ x: 0, y: 0 });
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

// Update container dimensions
const updateContainerDimensions = () => {
  if (documentPage.value) {
    containerWidth.value = documentPage.value.clientWidth;
    containerHeight.value = documentPage.value.clientHeight;
  }
};

// Get grid size based on zoom level
const getGridSize = () => {
  // Base grid size is 10px, adjusted for zoom
  return Math.max(5, Math.round(10 * props.zoom / 100));
};

// Handle block moved event
const handleBlockMoved = (block) => {
  if (props.showGrid) {
    // Ensure block position is snapped to grid
    const gridSize = getGridSize();
    block.x = Math.round(block.x / gridSize) * gridSize;
    block.y = Math.round(block.y / gridSize) * gridSize;

    // Update the model
    emit('update:modelValue', textBlocks.value);
  }
};

// Handle block resized event
const handleBlockResized = (block) => {
  if (props.showGrid) {
    // Ensure block size is snapped to grid
    const gridSize = getGridSize();
    block.width = Math.round(block.width / gridSize) * gridSize;
    block.height = Math.round(block.height / gridSize) * gridSize;

    // Update the model
    emit('update:modelValue', textBlocks.value);
  }
};

// Handle keyboard arrow keys for precise block movement
const handleKeyDown = (e) => {
  if (!selectedBlockId.value) return;

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return;

  // Handle Delete key to remove the selected block
  if (e.key === 'Delete') {
    e.preventDefault();
    deleteSelectedBlock();
    return;
  }

  // Determine movement amount
  let moveAmount;

  if (e.shiftKey) {
    // Fine movement (1px) when Shift is pressed
    moveAmount = 1;
  } else if (props.showGrid) {
    // Grid size movement when grid is enabled
    moveAmount = getGridSize();
  } else {
    // Default movement (5px)
    moveAmount = 5;
  }

  // Handle arrow keys
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      block.x = Math.max(0, block.x - moveAmount);
      break;
    case 'ArrowRight':
      e.preventDefault();
      block.x = Math.min(containerWidth.value - block.width, block.x + moveAmount);
      break;
    case 'ArrowUp':
      e.preventDefault();
      block.y = Math.max(0, block.y - moveAmount);
      break;
    case 'ArrowDown':
      e.preventDefault();
      block.y = Math.min(containerHeight.value - block.height, block.y + moveAmount);
      break;
    default:
      return; // Exit if not an arrow key
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Delete the selected block
const deleteSelectedBlock = () => {
  if (!selectedBlockId.value) return;
  deleteBlock(selectedBlockId.value);
};

// Delete a block by ID
const deleteBlock = (blockId) => {
  // Find the index of the block to delete
  const blockIndex = textBlocks.value.findIndex(b => b.id === blockId);
  if (blockIndex === -1) return;

  // Get the editor for this block
  const editor = editors.value.get(blockId);
  if (editor) {
    // Destroy the editor instance
    editor.destroy();
    editors.value.delete(blockId);
  }

  // Remove the block from the array
  textBlocks.value.splice(blockIndex, 1);

  // Clear the selected block ID if it was the one deleted
  if (selectedBlockId.value === blockId) {
    selectedBlockId.value = null;
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

// Initialize dimensions when mounted
onMounted(() => {
  updateContainerDimensions();

  // Add resize observer to update dimensions when window resizes
  const resizeObserver = new ResizeObserver(() => {
    updateContainerDimensions();
  });

  if (documentPage.value) {
    resizeObserver.observe(documentPage.value);
  }

  // Add keyboard event listener for arrow keys
  document.addEventListener('keydown', handleKeyDown);

  // Clean up observer and event listeners on unmount
  onUnmounted(() => {
    resizeObserver.disconnect();
    document.removeEventListener('keydown', handleKeyDown);
  });
});

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
  const rect = documentPage.value.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // Update mouse position
  mousePosition.value = {
    x: Math.round(currentX),
    y: Math.round(currentY)
  };

  // Update selection area if selecting
  if (isSelecting.value) {
    selectionArea.value = {
      x: Math.min(startX.value, currentX),
      y: Math.min(startY.value, currentY),
      width: Math.abs(currentX - startX.value),
      height: Math.abs(currentY - startY.value),
    };
  }
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
    element.style.padding = '20px';
    element.style.maxWidth = '800px';
    element.style.margin = '0 auto';
    element.style.background = 'white';

    // Get the current content
    const currentContent = props.modelValue;
    console.log('Current content:', currentContent); // Debug log

    // Build the HTML content
    let htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #333;">${proposalTitle}</h1>
    `;

    // Process each block in the content array
    if (Array.isArray(currentContent)) {
      currentContent.forEach(block => {
        // Extract the blocks array from the content
        const editorBlocks = block.content.blocks || [];

        editorBlocks.forEach(editorBlock => {
          switch (editorBlock.type) {
            case 'header':
              const level = editorBlock.data.level || 2;
              htmlContent += `
                <h${level} style="margin: 15px 0; color: #333;">
                  ${editorBlock.data.text}
                </h${level}>`;
              break;

            case 'paragraph':
              htmlContent += `
                <p style="margin: 10px 0; line-height: 1.6;">
                  ${editorBlock.data.text}
                </p>`;
              break;

            case 'list':
              const listType = editorBlock.data.style === 'ordered' ? 'ol' : 'ul';
              const listItems = editorBlock.data.items
                .map(item => `<li style="margin: 5px 0;">${item}</li>`)
                .join('');
              htmlContent += `
                <${listType} style="margin: 10px 0; padding-left: 20px;">
                  ${listItems}
                </${listType}>`;
              break;

            case 'table':
              const tableContent = editorBlock.data.content
                .map(row => `
                  <tr>
                    ${row.map(cell => `
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${cell}
                      </td>`).join('')}
                  </tr>`
                ).join('');
              htmlContent += `
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  ${tableContent}
                </table>`;
              break;

            case 'quote':
              htmlContent += `
                <blockquote style="margin: 15px 0; padding: 10px 20px; border-left: 3px solid #ddd; font-style: italic;">
                  <p>${editorBlock.data.text}</p>
                  ${editorBlock.data.caption ?
                  `<footer style="margin-top: 5px; font-size: 0.9em;">— ${editorBlock.data.caption}</footer>`
                  : ''}
                </blockquote>`;
              break;

            case 'checklist':
              const checklistItems = editorBlock.data.items
                .map(item => `
                  <div style="display: flex; align-items: center; margin: 5px 0;">
                    <span style="margin-right: 10px;">
                      ${item.checked ? '☑' : '☐'}
                    </span>
                    <span>${item.text}</span>
                  </div>`
                ).join('');
              htmlContent += `
                <div style="margin: 10px 0;">
                  ${checklistItems}
                </div>`;
              break;
          }
        });
      });
    }

    htmlContent += '</div>';
    element.innerHTML = htmlContent;

    // Add element to document
    document.body.appendChild(element);
    console.log('HTML content created:', element.innerHTML); // Debug log

    const opt = {
      margin: [15, 15],
      filename: `${proposalTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    // Generate PDF
    await html2pdf().set(opt).from(element).save();
    console.log('PDF generation completed'); // Debug log

    // Cleanup
    document.body.removeChild(element);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
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

// Get position text for the selected block
const getSelectedBlockPositionText = () => {
  if (!selectedBlockId.value) return '';

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return '';

  return `X: ${block.x}px  Y: ${block.y}px  W: ${block.width}px  H: ${block.height}px`;
};

// Align blocks to guides
const alignBlocksToGuides = (guides) => {
  if (!selectedBlockId.value) return;

  const block = textBlocks.value.find(b => b.id === selectedBlockId.value);
  if (!block) return;

  // Check if block is close to any horizontal guide
  if (guides.horizontalGuides) {
    guides.horizontalGuides.forEach(guidePos => {
      // Check if top edge is close to guide
      if (Math.abs(block.y - guidePos) < 10) {
        block.y = guidePos;
      }
      // Check if bottom edge is close to guide
      else if (Math.abs(block.y + block.height - guidePos) < 10) {
        block.y = guidePos - block.height;
      }
      // Check if center is close to guide
      else if (Math.abs(block.y + block.height/2 - guidePos) < 10) {
        block.y = guidePos - block.height/2;
      }
    });
  }

  // Check if block is close to any vertical guide
  if (guides.verticalGuides) {
    guides.verticalGuides.forEach(guidePos => {
      // Check if left edge is close to guide
      if (Math.abs(block.x - guidePos) < 10) {
        block.x = guidePos;
      }
      // Check if right edge is close to guide
      else if (Math.abs(block.x + block.width - guidePos) < 10) {
        block.x = guidePos - block.width;
      }
      // Check if center is close to guide
      else if (Math.abs(block.x + block.width/2 - guidePos) < 10) {
        block.x = guidePos - block.width/2;
      }
    });
  }

  // Update the model
  emit('update:modelValue', textBlocks.value);
};

watch(() => props.action, (newAction) => {
  if (newAction === 'addText') {
    isSelecting.value = false;
    selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
  }
});
</script>

<template>
  <div class="editor-container" ref="documentPage" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
    @mouseup="handleMouseUp">

    <!-- Text Blocks -->
    <draggable-resizable-vue
      v-for="block in textBlocks"
      :key="block.id"
      class="resizable-content"
      :class="{ 'text-block-selected': block.id == selectedBlockId }"
      @mousedown.stop="selectBlock(block.id)"
      v-model:x="block.x"
      v-model:y="block.y"
      v-model:h="block.height"
      v-model:w="block.width"
      v-model:active="block.isActive"
      :grid="props.showGrid ? [getGridSize(), getGridSize()] : [1, 1]"
      :snap="props.showGrid"
      @dragstop="handleBlockMoved(block)"
      @resizestop="handleBlockResized(block)"
      handles-type="borders">
      <div class="text-block-content">
        <div :id="`editor-${block.id}`"></div>
      </div>

      <!-- Delete Button -->
      <div v-if="block.isActive && !props.readonly" class="block-delete-btn" @click.stop="deleteBlock(block.id)">
        <span class="material-icons">close</span>
      </div>
    </draggable-resizable-vue>

    <!-- Selection Area -->
    <div v-if="isSelecting" class="selection-area" :style="{
      left: `${selectionArea.x}px`,
      top: `${selectionArea.y}px`,
      width: `${selectionArea.width}px`,
      height: `${selectionArea.height}px`,
    }">
    </div>

    <!-- Selection Area -->
    <div v-if="isSelecting" class="selection-area" :style="{
      left: `${selectionArea.x}px`,
      top: `${selectionArea.y}px`,
      width: `${selectionArea.width}px`,
      height: `${selectionArea.height}px`
    }"></div>

    <!-- Ruler Component -->
    <EditorRuler
      v-if="!props.readonly"
      v-model:showGrid="props.showGrid"
      :zoom="props.zoom"
      :containerWidth="containerWidth"
      :containerHeight="containerHeight"
      :gridSize="getGridSize()"
      :blocks="textBlocks"
      @alignBlocks="alignBlocksToGuides"
    />

    <!-- Position Indicators -->
    <div v-if="selectedBlockId && !props.readonly" class="position-indicator block-position">
      {{ getSelectedBlockPositionText() }}
    </div>

    <!-- Mouse Position Indicator -->
    <div v-if="!props.readonly" class="position-indicator mouse-position">
      X: {{ mousePosition.x }}px  Y: {{ mousePosition.y }}px
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div v-if="!props.readonly" class="keyboard-shortcuts">
      <div class="shortcut-icon" title="Keyboard Shortcuts">
        <span class="material-icons">keyboard</span>
        <div class="shortcut-tooltip">
          <div class="tooltip-title">Keyboard Shortcuts</div>
          <div class="shortcut-item">
            <span class="key">↑ ↓ ← →</span>
            <span>Move selected block</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Shift + Arrows</span>
            <span>Move by 1px</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Delete</span>
            <span>Delete selected block</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 800px;
  background: white;
  padding-top: 25px;  /* Space for horizontal ruler */
  padding-left: 25px; /* Space for vertical ruler */
}

.resizable-content {
  background: white;
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

/* Position indicators */
.position-indicator {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 100;
  pointer-events: none;
}

.block-position {
  bottom: 10px;
  right: 10px;
}

.mouse-position {
  top: 35px; /* Below the horizontal ruler */
  right: 10px;
}

/* Keyboard shortcuts tooltip */
.keyboard-shortcuts {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
}

.shortcut-icon {
  width: 30px;
  height: 30px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.shortcut-icon:hover .shortcut-tooltip {
  display: block;
}

.shortcut-tooltip {
  display: none;
  position: absolute;
  bottom: 40px;
  left: 0;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 4px;
  width: 220px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.key {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
}

/* Block delete button */
.block-delete-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.block-delete-btn .material-icons {
  font-size: 14px;
}

.block-delete-btn:hover {
  background-color: #d32f2f;
}
</style>
