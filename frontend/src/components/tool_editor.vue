<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import DraggableResizableVue from 'draggable-resizable-vue3'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Quote from '@editorjs/quote'
import Table from '@editorjs/table'
import Image from '@editorjs/image'
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
        content: { blocks: [] },
    };

    textBlocks.value.push(newBlock);
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

    // Add content directly if it's an array
    if (Array.isArray(currentContent)) {
      currentContent.forEach(block => {
        htmlContent += `<div style="margin: 10px 0;">${block.data?.text || JSON.stringify(block)}</div>`;
      });
    } else {
      // If it's a single block or other format
      htmlContent += `<div style="margin: 10px 0;">${JSON.stringify(currentContent)}</div>`;
    }

    htmlContent += '</div>';
    element.innerHTML = htmlContent;

    // Add element to document
    document.body.appendChild(element);
    console.log('HTML content created:', element.innerHTML); // Debug log

    const opt = {
      margin: 10,
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

watch(() => props.action, (newAction) => {
    if (newAction === 'addText') {
        isSelecting.value = false;
        selectionArea.value = { x: 0, y: 0, width: 0, height: 0 };
    }
});
</script>

<template>
  <div class="editor-container" ref="documentPage">
    <!-- Text Blocks -->
    <draggable-resizable-vue 
        v-for="block in textBlocks" 
        :key="block.id" 
        class="resizable-content"
        :class="{ 'text-block-selected': selectedBlockId === block.id }" 
        @mousedown.stop="selectBlock(block.id)"
        :style="{
            left: `${block.x}px`,
            top: `${block.y}px`,
            width: `${block.width}px`,
            height: `${block.height}px`,
            position: 'absolute'
        }"
        :draggable="!readonly"
        :resizable="!readonly"
        @dragstop="handleDragStop"
        @resizestop="handleResizeStop"
    >
        <div class="text-block-content">
            <div :id="`editor-${block.id}`"></div>
        </div>
    </draggable-resizable-vue>
    
    <!-- Selection Area -->
    <div v-if="isSelecting" class="selection-area" :style="{
        left: `${selectionArea.x}px`,
        top: `${selectionArea.y}px`,
        width: `${selectionArea.width}px`,
        height: `${selectionArea.height}px`
    }"></div>
  </div>
</template>

<style scoped>
.editor-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 800px;
    background: white;
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
    border: 2px solid #1976D2;
}

.selection-area {
    position: absolute;
    border: 2px dashed #1976D2;
    background: rgba(25, 118, 210, 0.1);
    pointer-events: none;
}
</style>
