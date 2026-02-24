import { getSongsById } from "@/lib/fetch";
import Recomandation from "../_components/Recomandation";
import SongHero from "../_components/SongHero";

export const generateMetadata = async ({ params }) => {
  const title = await getSongsById(params.id);
  const data = await title.json();
  console.log(data);
  const song = data?.data[0];
  return {
    title: song.name,
    description: `Listen to "${song.name}" by ${data?.artists?.primary[0]?.name || "unknown"} from the album "${song.album?.name}".`,
    openGraph: {
      title: song.name,
      description: `Listen to "${song.name}" by ${data?.artists?.primary[0]?.name || "unknown"}.`,
      type: "music.song",
      url: song.url,
      images: [
        {
          url: song.image[2]?.url || song.image[1]?.url || song.image[0]?.url,
          width: 1200,
          height: 630,
          alt: song.name,
        },
      ],
      music: {
        album: song.album?.url,
        release_date: song.releaseDate,
        musician: data?.artists?.primary[0]?.name || "unknown",
      },
    },
    twitter: {
      card: "summary_large_image",
      title: song.name,
      description: `Listen to "${song.name}" by ${data?.artists?.primary[0]?.name || "unknown"}.`,
      images: song.image?.[0]?.url,
    },
  };
};

export default function Page({ params }) {
  return (
    <div className="pt-4 md:pt-6">
      <SongHero id={params.id} />
      <Recomandation id={params.id} />
    </div>
  );
}
