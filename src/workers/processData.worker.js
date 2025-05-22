/* eslint-disable no-restricted-globals */

self.onmessage = function (e) {
    const data = e.data
    try {
        let soToKhai
        let maNuoc
        let soHoaDon
        let maHangHoa
        let moTaHangHoa

        let currentWatch

        let myDataList = []

        for (const line of data) {
            const entries = Object.entries(line) // chuyển object thành mảng các [key, value]
            for (let i = 0; i < entries.length; i++) {
                const [_, value] = entries[i]
                if (value) {
                    if (!currentWatch) {
                        switch (value) {
                            case 'Số tờ khai':
                                currentWatch = 'soToKhai'
                                break
                            case 'Mã nước':
                                currentWatch = 'maNuoc'
                                break
                            case 'Số hóa đơn':
                                currentWatch = 'soHoaDon'
                                break
                            case 'Mã số hàng hóa':
                                currentWatch = 'maHangHoa'
                                break
                            case 'Mô tả hàng hóa':
                                currentWatch = 'moTaHangHoa'
                                break
                            default:
                                break
                        }
                    } else {
                        switch (currentWatch) {
                            case 'soToKhai':
                                soToKhai = value
                                currentWatch = null
                                break
                            case 'maNuoc':
                                maNuoc = value?.toString()
                                currentWatch = null
                                break
                            case 'soHoaDon':
                                soHoaDon =
                                    i + 2 > entries.length - 1
                                        ? value?.toString()
                                        : `${value?.toString()}${entries[
                                              i + 1
                                          ][1]?.toString()}${entries[
                                              i + 2
                                          ][1]?.toString()}`
                                currentWatch = null
                                break
                            case 'maHangHoa':
                                maHangHoa = value?.toString()
                                currentWatch = null
                                break
                            case 'moTaHangHoa':
                                moTaHangHoa = value?.toString()
                                currentWatch = null
                                break
                            default:
                                break
                        }
                    }
                }

                if (maHangHoa && moTaHangHoa) {
                    myDataList.push({
                        soToKhai,
                        maNuoc,
                        soHoaDon,
                        maHangHoa,
                        moTaHangHoa,
                    })
                    maHangHoa = null
                    moTaHangHoa = null
                }
            }
        }
        self.postMessage({ success: true, data: myDataList })
    } catch (err) {
        self.postMessage({ success: false, error: err.message })
    }
}
