import { useState } from 'react'
import './App.css'
import Dropzone from 'react-dropzone'
import * as FileSaver from 'file-saver'
import styled from 'styled-components'
import excelLogo from './images/excel.png'
import enImg from './images/en.png'

const validExcelFile = [
    '.csv',
    '.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
]

function App() {
    const [dropState, setDropState] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleExportToExcel = async (data, fileName) => {
        const exportToExcelWorker = new Worker(
            new URL('./workers/exportToExcel.worker.js', import.meta.url)
        )

        exportToExcelWorker.postMessage({ data, fileName })

        exportToExcelWorker.onmessage = (e) => {
            const { blob, fileName } = e.data
            setIsProcessing(false)
            FileSaver.saveAs(blob, fileName)
            exportToExcelWorker.terminate()
        }

        exportToExcelWorker.onerror = (err) => {
            alert('Lỗi không xác định: ' + err.message)
            setIsProcessing(false)
            exportToExcelWorker.terminate()
        }
    }

    const handleAddFile = async (files) => {
        try {
            if (files.length === 0) return
            if (files.some((i) => !validExcelFile.includes(i.type)))
                return alert('File của bạn phải là excel')

            setIsProcessing(true)

            let result = []

            // Create an array of promises for all files
            const filePromises = files.map(
                (file) =>
                    new Promise(async (resolve, reject) => {
                        const buffer = await new Promise((res, rej) => {
                            const fileReader = new FileReader()
                            fileReader.readAsArrayBuffer(file)
                            fileReader.onload = (e) => res(e.target.result)
                            fileReader.onerror = (err) => rej(err)
                        })

                        const worker = new Worker(
                            new URL(
                                './workers/excelContentReader.worker.js',
                                import.meta.url
                            )
                        )

                        worker.postMessage(buffer)

                        worker.onmessage = (e) => {
                            const { success, data } = e.data
                            worker.terminate()
                            if (success) {
                                const processWorker = new Worker(
                                    new URL(
                                        './workers/processData.worker.js',
                                        import.meta.url
                                    )
                                )
                                processWorker.postMessage(data)
                                processWorker.onmessage = (e) => {
                                    const { success, data } = e.data
                                    processWorker.terminate()
                                    if (success) {
                                        resolve(data) // resolve with processed data
                                    } else {
                                        alert('Lỗi không xác định: ' + data)
                                        resolve([]) // resolve with empty array on error
                                    }
                                }
                                processWorker.onerror = (err) => {
                                    alert('Lỗi không xác định: ' + err.message)
                                    processWorker.terminate()
                                    resolve([])
                                }
                            } else {
                                resolve([])
                            }
                        }

                        worker.onerror = (err) => {
                            alert('Lỗi không xác định: ' + err.message)
                            worker.terminate()
                            resolve([])
                        }
                    })
            )

            // Wait for all files to be processed
            const allResults = await Promise.all(filePromises)
            result = allResults.flat()
            const fileName = 'Dữ liệu tổng hợp'
            handleExportToExcel(result, fileName)
        } catch (error) {
            alert('Lỗi không xác định: ' + error.message)
            setIsProcessing(false)
        }
    }

    return (
        <Wrapper>
            <div className="dropbox-container-wrapper">
                <div className="dropbox-area-wrapper">
                    {isProcessing ? (
                        <div className="loading">
                            <img alt="" src={enImg} />
                            <div className="loader_description"></div>
                        </div>
                    ) : (
                        <div
                            className={`dropbox-area ${
                                dropState === 2 && 'alert'
                            }`}
                        >
                            <div
                                className={`dropbox-spin ${
                                    dropState === 2 && 'alert'
                                }`}
                            ></div>
                            <div className="dropbox-container">
                                <Dropzone
                                    multiple={true}
                                    onDragOver={() => setDropState(2)}
                                    onDropAccepted={() => setDropState(0)}
                                    onDropRejected={() => setDropState(0)}
                                    onDragLeave={() => setDropState(0)}
                                    onFileDialogCancel={() => setDropState(0)}
                                    onDrop={(acceptedFiles) =>
                                        handleAddFile(acceptedFiles)
                                    }
                                >
                                    {({ getRootProps, getInputProps }) => (
                                        <section
                                            className={`dropbox-wrapper ${
                                                dropState === 2 && 'alert'
                                            }`}
                                        >
                                            <div
                                                {...getRootProps()}
                                                className="dropbox"
                                            >
                                                <input
                                                    {...getInputProps()}
                                                    onClick={(event) => {
                                                        event.target.value = ''
                                                    }}
                                                />
                                                {dropState !== 2 ? (
                                                    <>
                                                        <div
                                                            className={`dropbox-icon-wrapper`}
                                                        >
                                                            <img
                                                                alt=""
                                                                src={excelLogo}
                                                            />
                                                        </div>
                                                        <h3>
                                                            Click hoặc kéo thả
                                                            file vào
                                                        </h3>
                                                    </>
                                                ) : (
                                                    <div className="dropbox-alert">
                                                        <h1>Thả vào!</h1>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </Dropzone>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Wrapper>
    )
}

const Wrapper = styled.div`
    height: 100vh;
    display: flex;
    .dropbox-container-wrapper {
        flex: 1;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        flex-direction: column;
        .dropbox-area-wrapper {
            display: flex;
            height: 100%;
            justify-content: center;
            align-items: center;
            .loading {
                font-size: 1.5rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                flex-direction: column;
                justify-content: center;
                img {
                    height: 150px;
                }
                .loader_description {
                    width: fit-content;
                    font-weight: bold;
                    font-family: monospace;
                    font-size: 24px;
                    clip-path: inset(0 3ch 0 0);
                    animation: l4 1.7s steps(4) infinite;
                }
                .loader_description:before {
                    content: 'Đang xử lý...';
                }
                @keyframes l4 {
                    to {
                        clip-path: inset(0 -1ch 0 0);
                    }
                }
            }
            @media (max-width: 350px) {
                width: 260px;
                height: 260px;
            }
            @media (max-width: 300px) {
                width: 240px;
                height: 240px;
            }
            .dropbox-area {
                width: 300px;
                height: 300px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
                position: relative;
                padding: 0.75rem;
                .dropbox-spin {
                    width: 300px;
                    height: 300px;
                    position: absolute;
                    border-radius: 50%;
                    border: 5px dashed #0d9ede;
                    animation: spin 60s linear infinite;
                    @media (max-height: 700px) {
                        /* border-radius:0; */
                        border: 4px dashed #0d9ede;
                    }
                    @media (max-height: 700px) and (max-width: 426px) {
                        /* border-radius:0; */
                        border: 4px dashed #0d9ede;
                    }
                    @-moz-keyframes spin {
                        100% {
                            -moz-transform: rotate(360deg);
                        }
                    }
                    @-webkit-keyframes spin {
                        100% {
                            -webkit-transform: rotate(360deg);
                        }
                    }
                    @keyframes spin {
                        100% {
                            -webkit-transform: rotate(360deg);
                            transform: rotate(360deg);
                        }
                    }
                }
                .dropbox-spin.alert {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    border-radius: 50%;
                    border: 5px dashed #0d9ede;
                    animation: spin 10s linear infinite;
                    @media (max-height: 700px) {
                        /* border-radius:0; */
                        border: 4px dashed #0d9ede;
                    }
                    @media (max-height: 700px) and (max-width: 426px) {
                        /* border-radius:0; */
                        border: 4px dashed #0d9ede;
                    }
                    @-moz-keyframes spin {
                        100% {
                            -moz-transform: rotate(360deg);
                        }
                    }
                    @-webkit-keyframes spin {
                        100% {
                            -webkit-transform: rotate(360deg);
                        }
                    }
                    @keyframes spin {
                        100% {
                            -webkit-transform: rotate(360deg);
                            transform: rotate(360deg);
                        }
                    }
                }
                .dropbox-container {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    position: relative;
                    border-radius: 50%;
                    background: ${(props) => props.theme.primary};
                    .dropbox-wrapper {
                        width: 100%;
                        border-radius: 50%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s;
                        background: ${(props) => props.theme.dropboxBackground};
                        :hover {
                            background: ${(props) =>
                                props.theme.dropboxBackgroundWhenHover};
                        }
                        @media (max-height: 700px) {
                            /* border-radius:0; */
                        }

                        @media (max-height: 700px) and (max-width: 426px) {
                            /* border-radius:0; */
                        }
                        .dropbox {
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-direction: column;
                            @media (max-height: 550px) {
                                padding: 0.5rem;
                            }
                            input {
                                width: 100%;
                                height: 100%;
                            }

                            .dropbox-alert {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 100%;
                                h1 {
                                    margin: 0;
                                    font-size: 2.5rem;
                                    font-weight: 600;
                                    text-align: center;
                                    color: white;
                                }
                            }

                            .dropbox-icon-wrapper {
                                img {
                                    width: 70px;
                                    height: 70px;
                                }
                            }
                            .dropbox-icon-wrapper.shake {
                                position: relative;
                                animation: shake 0.5s;
                                animation-iteration-count: infinite;
                                @keyframes shake {
                                    0% {
                                        transform: translate(1px, 1px)
                                            rotate(0deg);
                                    }
                                    10% {
                                        transform: translate(-1px, -2px)
                                            rotate(-1deg);
                                    }
                                    20% {
                                        transform: translate(-3px, 0px)
                                            rotate(1deg);
                                    }
                                    30% {
                                        transform: translate(3px, 2px)
                                            rotate(0deg);
                                    }
                                    40% {
                                        transform: translate(1px, -1px)
                                            rotate(1deg);
                                    }
                                    50% {
                                        transform: translate(-1px, 2px)
                                            rotate(-1deg);
                                    }
                                    60% {
                                        transform: translate(-3px, 1px)
                                            rotate(0deg);
                                    }
                                    70% {
                                        transform: translate(3px, 1px)
                                            rotate(-1deg);
                                    }
                                    80% {
                                        transform: translate(-1px, -1px)
                                            rotate(1deg);
                                    }
                                    90% {
                                        transform: translate(1px, 2px)
                                            rotate(0deg);
                                    }
                                    100% {
                                        transform: translate(1px, -2px)
                                            rotate(-1deg);
                                    }
                                }
                            }
                            h3 {
                                margin: 0;
                                font-size: 20px;
                                color: ${(props) => props.theme.primary};
                                font-weight: 500;
                                text-align: center;
                                @media (max-height: 550px) {
                                    font-size: 16px;
                                }
                            }
                            small {
                                margin: 0;
                                color: grey;
                                font-size: 16px;
                                color: ${(props) => props.theme.primary};
                                text-align: center;
                                @media (max-height: 550px) {
                                    font-size: 14px;
                                }
                            }
                        }
                    }
                    .dropbox-wrapper.alert {
                        background: #0d9ede;
                    }
                }
            }
            .dropbox-area.alert {
                position: relative;
                transform: scale(1.1);
            }
        }

        .analysis_form_wrapper {
            padding: 0rem 1.5rem;
            border-radius: 0.5rem;
            margin: 1rem 0 2rem;
            @media (max-width: 769px) {
                padding: 0 1.25rem;
            }
            .analysis_input {
                padding: 0.25rem 0;
                p {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: ${(props) => props.theme.textColor};
                }
                input {
                    width: 100%;
                    font-size: 1rem;
                    border-radius: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    background: #f1f1f1;
                }
                select {
                    width: 100%;
                    font-size: 1rem;
                    border-radius: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    background: #f1f1f1;
                }
            }

            .start-btn {
                margin-top: 1rem;
                background-color: ${(props) => props.theme.textColor};
                padding: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
                border-radius: 0.5rem;
                position: relative;
                opacity: 1;
                :hover {
                    opacity: 0.7;
                }
                span {
                    font-weight: 500;
                    font-size: 1.1rem;
                    color: ${(props) => props.theme.primary};
                }
            }
        }

        h1 {
            margin: 0;
            margin-top: 1.5rem;
            font-size: 1.5rem;
            text-align: center;
            font-weight: 400;
            max-width: 80%;
            color: ${(props) => props.theme.textColor};
            @media (max-width: 350px) {
                font-size: 1rem;
            }
            @media (max-height: 550px) {
                margin-top: 0.5rem;
            }
            span {
                a {
                    cursor: pointer;
                    color: #0d9ede;
                    text-decoration: none;
                }
                :hover {
                    text-decoration: underline;
                }
            }
        }
    }
`

export default App
