export default function WaitingForPartner() {
    return (
        <div className="h-[420px] w-full flex flex-col items-center justify-center gap-6">
            <h2 className="text-xl md:text-2xl font-bold text-[#262D6C]">Wating for partner confirmation...</h2>

            <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border-8 border-gray-200/70" />
                <div
                className="absolute inset-0 rounded-full border-8 border-[#4A53A7]
                            border-t-transparent border-r-transparent animate-spin"
                />
            </div>
        </div>
    )
}