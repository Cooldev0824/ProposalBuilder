<script setup>
import { onMounted, ref, watch } from 'vue'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Paragraph from '@editorjs/paragraph'

const props = defineProps({
    zoom: {
        type: Number,
        default: 100
    }
})

const editor = ref(null)
const editorContainer = ref(null)

watch(() => props.zoom, (newZoom) => {
    if (editorContainer.value) {
        editorContainer.value.style.transform = `scale(${newZoom / 100})`
        editorContainer.value.style.transformOrigin = 'top center'
    }
})

onMounted(() => {
    editor.value = new EditorJS({
        holder: 'editorjs',
        tools: {
            header: {
                class: Header,
                config: {
                    levels: [1, 2, 3, 4],
                    defaultLevel: 1
                }
            },
            list: List,
            paragraph: {
                class: Paragraph,
                inlineToolbar: true
            }
        },
        data: {
            blocks: [
                {
                    type: "header",
                    data: {
                        text: "Document Title",
                        level: 1
                    }
                },
                {
                    type: "paragraph",
                    data: {
                        text: "Start typing your content here..."
                    }
                }
            ]
        }
    })
})
</script>

<template>
    <div class="editor-wrapper">
        <div ref="editorContainer" class="editor-content">
            <div id="editorjs"></div>
        </div>
    </div>
</template>

<style scoped>
.editor-wrapper {
    flex: 1;
    max-width: 816px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
}

.editor-content {
    background: white;
    min-height: 1056px;
    padding: 40px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
    transform-origin: top left; /* Changed from top center to top left */
}

:deep(.ce-block__content) {
    max-width: 100%;
}

:deep(.ce-toolbar__content) {
    max-width: 100%;
}

:deep(.ce-toolbar__plus) {
    color: var(--v-theme-primary);
}

:deep(.ce-toolbar__settings-btn) {
    color: var(--v-theme-primary);
}
</style>
