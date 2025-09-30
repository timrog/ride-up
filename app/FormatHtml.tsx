import { marked } from "marked"
import React from 'react'

interface FormatHtmlProps {
    content: string
}

const FormatHtml: React.FC<FormatHtmlProps> = ({ content }) => {
    const formatContent = (text: string) => {
        return marked.parse(text)
    }

    return (
        <span dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
    )
}

export default FormatHtml