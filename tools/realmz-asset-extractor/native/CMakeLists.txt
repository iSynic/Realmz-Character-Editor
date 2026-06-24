cmake_minimum_required(VERSION 3.27)

project(realmz_asset_extractor LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(phosg REQUIRED)
find_package(resource_file REQUIRED)

add_executable(extract-realmz-assets extract-realmz-assets.cpp)
target_link_libraries(extract-realmz-assets
  PRIVATE
  resource_file::resource_file
  phosg::phosg
  z
)

if(WIN32)
  target_compile_definitions(extract-realmz-assets PRIVATE PHOSG_WINDOWS=1)
  target_link_libraries(extract-realmz-assets PRIVATE bcrypt ws2_32)
endif()
