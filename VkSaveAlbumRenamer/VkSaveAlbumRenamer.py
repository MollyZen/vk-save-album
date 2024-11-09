import easyargs
import codecs
import piexif

from pathlib import Path
from urllib.parse import unquote
from PIL import Image
from bs4 import BeautifulSoup
from dateutil import parser

@easyargs
def main(file_path):
    f = codecs.open(file_path, "r", "UTF-8").read()
    soup = BeautifulSoup(f, features="html.parser")
    figures = soup("figure")
    incr = 0
    for figure in figures:
        # finding an image
        image = figure.findChild("img")

        # finding image paths
        image_path = Path(file_path).parent.joinpath(unquote(image['src']))
        image_folder = image_path.parent
        extension = image_path.suffix

        # managing date info
        time_tag = figure.findChild("time")
        datetime_attr = time_tag["datetime"]
        iso_date_time = parser.isoparse(datetime_attr)

        # getting description
        descr = figure.findChild("figcaption").text

        # changing metadata
        image_file = Image.open(str(image_path))

        zeroth_ifd = {
            piexif.ImageIFD.ImageDescription: str.encode(descr)
        }

        exif_ifd = {
            piexif.ExifIFD.DateTimeOriginal: str(iso_date_time.strftime("%Y:%m:%d %H:%M:%S")),
            piexif.ExifIFD.OffsetTimeOriginal: "+00:00",
            piexif.ExifIFD.OffsetTime: "+00:00"
        }

        exif_dict = {
            "0th": zeroth_ifd,
            "Exif": exif_ifd
        }

        exif_bytes = piexif.dump(exif_dict)

        image_file.save(image_path, exif=exif_bytes, optimize=False, quality=100)
        image_file.close()
        # renaming
        image_path.rename(image_folder.joinpath(image['title'] + "-" + str(incr) + extension))
        incr += 1

if __name__ == '__main__':
    main()