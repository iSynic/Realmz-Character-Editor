#include <phosg/Filesystem.hh>
#include <phosg/Image.hh>
#include <phosg/Strings.hh>
#include <resource_file/IndexFormats/Formats.hh>
#include <resource_file/ResourceFile.hh>
#include <resource_file/ResourceTypes.hh>

#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace std;
namespace fs = std::filesystem;

struct SourceFile {
  string path;
  ResourceDASM::ResourceFile resources;
};

static vector<int16_t> read_ids(const string& path) {
  ifstream f(path);
  if (!f.is_open()) {
    throw runtime_error("failed to open ID list: " + path);
  }

  vector<int16_t> ids;
  string line;
  while (getline(f, line)) {
    phosg::strip_whitespace(line);
    if (line.empty() || line[0] == '#') {
      continue;
    }
    const int parsed = stoi(line);
    if (parsed < INT16_MIN || parsed > INT16_MAX) {
      throw runtime_error("resource ID is outside signed 16-bit range: " + line);
    }
    ids.emplace_back(static_cast<int16_t>(parsed));
  }
  return ids;
}

static vector<SourceFile> load_sources(int argc, char** argv, int first_source_arg) {
  vector<SourceFile> sources;
  for (int x = first_source_arg; x < argc; x++) {
    const string path = argv[x];
    try {
      sources.emplace_back(SourceFile{
          .path = path,
          .resources = ResourceDASM::parse_resource_fork(phosg::load_file(path)),
      });
    } catch (const exception& e) {
      cerr << "warning: failed to parse " << path << ": " << e.what() << endl;
    }
  }
  return sources;
}

int main(int argc, char** argv) {
  if (argc < 4) {
    cerr << "usage: extract-realmz-assets <out-dir> <id-list.txt> <resource.rsrc> [resource2.rsf ...]" << endl;
    return 64;
  }

  try {
    const fs::path out_dir = argv[1];
    const auto ids = read_ids(argv[2]);
    auto sources = load_sources(argc, argv, 3);
    if (sources.empty()) {
      throw runtime_error("no readable resource files were provided");
    }

    fs::create_directories(out_dir);

    size_t exported = 0;
    vector<int> missing;
    for (int16_t id : ids) {
      bool found = false;
      for (const auto& source : sources) {
        if (!source.resources.resource_exists(ResourceDASM::RESOURCE_TYPE_cicn, id)) {
          continue;
        }

        const auto decoded = source.resources.decode_cicn(id);
        const auto out_path = (out_dir / (to_string(id) + ".png")).string();
        phosg::save_file(out_path, decoded.image.serialize(phosg::ImageFormat::PNG));
        exported++;
        found = true;
        break;
      }
      if (!found) {
        missing.emplace_back(id);
      }
    }

    cout << "exported " << exported << " PNG assets to " << out_dir.string() << endl;
    if (!missing.empty()) {
      cerr << "missing " << missing.size() << " cicn resources:";
      for (int id : missing) {
        cerr << " " << id;
      }
      cerr << endl;
      return 2;
    }
    return 0;

  } catch (const exception& e) {
    cerr << "extract-realmz-assets failed: " << e.what() << endl;
    return 1;
  }
}
